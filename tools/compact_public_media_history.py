"""One-time approved image/video history compaction; exact paths, tree checks, atomic leases."""
import argparse
import base64
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys

REPOSITORY = 'aetherismanga/le-roy-factory'
URL = 'https://github.com/' + REPOSITORY + '.git'
ROOT = Path(os.environ.get('RUNNER_TEMP', '.')).resolve() / 'lrf-media-history-compaction'
SOURCE = ROOT / 'before.git'
FILTERED = ROOT / 'after.git'
BACKUP = ROOT / 'backup'
REPORT = ROOT / 'report'
CONFIG = Path(__file__).with_name('public_media_history_plan.json')

def git(repo, *args, auth=False):
    env = os.environ.copy()
    if auth and env.get('GH_TOKEN'):
        credential = base64.b64encode(('x-access-token:' + env['GH_TOKEN']).encode()).decode()
        env.update(GIT_CONFIG_COUNT='1', GIT_CONFIG_KEY_0='http.https://github.com/.extraheader',
                   GIT_CONFIG_VALUE_0='AUTHORIZATION: basic ' + credential)
    return subprocess.check_output(['git', '--git-dir=' + str(repo), *args], env=env)

def refs(repo, prefix=''):
    return dict(line.split(' ', 1)[::-1] for line in git(repo, 'for-each-ref',
                '--format=%(objectname) %(refname)', prefix).decode().splitlines())

def tree(repo, sha):
    result = {}
    for line in git(repo, 'ls-tree', '-rz', '--full-tree', sha).split(b'\0'):
        if line:
            metadata, path = line.split(b'\t', 1)
            result[path.decode()] = metadata.decode()
    return result

def remote_heads():
    return dict(line.split('\t', 1)[::-1] for line in git(SOURCE, 'ls-remote', '--heads', URL,
                                                       auth=True).decode().splitlines())

def write_json(path, data):
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n')

def sha256_file(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(8 * 1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()

def prepare():
    config = json.loads(CONFIG.read_text())
    if os.environ.get('GITHUB_REPOSITORY') != REPOSITORY:
        raise RuntimeError('Unexpected repository')
    event_sha = os.environ['GITHUB_SHA']
    expected = config['heads'].copy()
    if len(expected) != 120 or len(config['paths']) != 888:
        raise RuntimeError('Unexpected authorized scope')
    ROOT.mkdir(exist_ok=False)
    BACKUP.mkdir()
    REPORT.mkdir()
    # Public remote URL; the standard Actions token is supplied via an ephemeral header.
    git(SOURCE, 'clone', '--mirror', URL, str(SOURCE), auth=True)
    if git(SOURCE, 'rev-parse', event_sha + '^').decode().strip() != expected['refs/heads/main']:
        raise RuntimeError('Unexpected parent of execution commit')
    expected['refs/heads/main'] = event_sha
    before = refs(SOURCE, 'refs/heads/')
    if before != expected:
        raise RuntimeError('A branch changed since authorization; no remote writes')
    write_json(BACKUP / 'original-heads.json', before)
    write_json(BACKUP / 'all-original-refs.json', refs(SOURCE))
    git(SOURCE, 'bundle', 'create', str(BACKUP / 'before.bundle'), '--all')
    git(SOURCE, 'bundle', 'verify', str(BACKUP / 'before.bundle'))
    (BACKUP / 'SHA256SUMS').write_text(sha256_file(BACKUP / 'before.bundle') + '  before.bundle\n')
    git(SOURCE, 'clone', '--mirror', '--no-hardlinks', str(SOURCE), str(FILTERED))
    # Anchors match exact files and preserve neighboring files and directories.
    pattern = '^(?:' + '|'.join(re.escape(p) for p in sorted(config['paths'])) + ')$'
    subprocess.run([sys.executable, '-m', 'git_filter_repo', '--force', '--path-regex',
                    pattern, '--invert-paths'], cwd=FILTERED, check=True)
    after = refs(FILTERED, 'refs/heads/')
    if before.keys() != after.keys():
        raise RuntimeError('Branch set changed while filtering')
    allowed = set(config['paths'])
    for ref in before:
        old_tree = tree(SOURCE, before[ref])
        new_tree = tree(FILTERED, after[ref])
        if {p: v for p, v in old_tree.items() if p not in allowed} != new_tree:
            raise RuntimeError('Unexpected file change: ' + ref)
    if tree(SOURCE, before['refs/heads/main']) != tree(FILTERED, after['refs/heads/main']):
        raise RuntimeError('Current main files changed')
    git(FILTERED, 'fsck', '--full')
    git(FILTERED, 'remote', 'add', 'origin', URL)
    report = {'status': 'validated-awaiting-backup-upload', 'repository': REPOSITORY,
              'paths': config['paths'], 'before': before, 'after': after,
              'branchCount': len(before), 'mainTreeUnchanged': True,
              'otherFilesUnchangedOnAllBranches': True,
              'untouchedRemoteRefs': {r: s for r, s in refs(SOURCE).items() if not r.startswith('refs/heads/')},
              'note': 'Remote tags and GitHub-managed pull refs are retained. GitHub size may not fall immediately.'}
    write_json(REPORT / 'result.json', report)
    print('Validated all 120 branch trees. Backup must upload successfully before apply.')

def apply():
    report = json.loads((REPORT / 'result.json').read_text())
    if report['status'] != 'validated-awaiting-backup-upload':
        raise RuntimeError('Already applied or invalid state')
    if remote_heads() != report['before']:
        raise RuntimeError('Remote branches changed; no remote writes')
    changed = {r: s for r, s in report['after'].items() if s != report['before'][r]}
    leases = ['--force-with-lease=' + r + ':' + report['before'][r] for r in changed]
    refspecs = [s + ':' + r for r, s in changed.items()]
    # Single atomic transaction: either all expected heads move or none do.
    git(FILTERED, 'push', '--atomic', *leases, 'origin', *refspecs, auth=True)
    actual = remote_heads()
    if actual != report['after']:
        raise RuntimeError('Post-push remote verification differs; inspect report before further writes')
    report.update(status='applied-and-verified', changedBranchCount=len(changed), actual=actual)
    write_json(REPORT / 'result.json', report)
    with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as summary:
        summary.write(f'## Image and video history compaction\n\n{len(changed)} branches rewritten atomically. '
                      'Current main tree unchanged; all other files preserved on every branch. '
                      'Original history bundle uploaded before the push (7-day retention). '
                      'Tags and GitHub pull-request refs remain unchanged.\n')
    print('Applied and verified:', len(changed), 'branches')

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('stage', choices=['prepare', 'apply'])
    args = parser.parse_args()
    {'prepare': prepare, 'apply': apply}[args.stage]()
