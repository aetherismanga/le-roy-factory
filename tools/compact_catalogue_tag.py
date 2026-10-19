"""Remove already migrated binaries from one historical tag, with backup and lease."""
import base64
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys

URL='https://github.com/aetherismanga/le-roy-factory.git'
TAG='refs/tags/fenice-general-2026-2027'
ROOT=Path(os.environ['RUNNER_TEMP'])/'lrf-catalogue-tag-compaction'
SOURCE=ROOT/'before.git'
AFTER=ROOT/'after.git'
BACKUP=ROOT/'backup'
REPORT=ROOT/'report'
CONFIG=Path(__file__).with_name('catalogue_tag_compaction_plan.json')

def git(repo,*args,auth=False):
    env=os.environ.copy()
    if auth and env.get('GH_TOKEN'):
        encoded=base64.b64encode(('x-access-token:'+env['GH_TOKEN']).encode()).decode()
        env.update(GIT_CONFIG_COUNT='1',GIT_CONFIG_KEY_0='http.https://github.com/.extraheader',
                   GIT_CONFIG_VALUE_0='AUTHORIZATION: basic '+encoded)
    return subprocess.check_output(['git','--git-dir='+str(repo),*args],env=env)

def refs(repo):
    return dict(line.split(' ',1)[::-1] for line in git(repo,'for-each-ref','--format=%(objectname) %(refname)').decode().splitlines())

def live_refs():
    return dict(line.split('\t',1)[::-1] for line in git(SOURCE,'ls-remote','--refs',URL,auth=True).decode().splitlines())

def tree(repo,ref):
    result={}
    for row in git(repo,'ls-tree','-rz','--full-tree',ref).split(b'\0'):
        if row:
            metadata,path=row.split(b'\t',1)
            result[path.decode()]=metadata.decode()
    return result

def save(path,value):
    path.write_text(json.dumps(value,indent=2,ensure_ascii=False)+'\n')

def prepare():
    config=json.loads(CONFIG.read_text())
    if os.environ['GITHUB_REPOSITORY']!='aetherismanga/le-roy-factory' or len(config['paths'])!=922:
        raise RuntimeError('Unexpected authorized scope')
    ROOT.mkdir(exist_ok=False);BACKUP.mkdir();REPORT.mkdir()
    git(SOURCE,'clone','--mirror',URL,str(SOURCE),auth=True)
    before=refs(SOURCE)
    if before[TAG]!=config['oldTag'] or before['refs/heads/main']!=os.environ['GITHUB_SHA']:
        raise RuntimeError('Remote changed; no tag update')
    if git(SOURCE,'rev-parse','refs/heads/main:assets/compat/corynelogo-20260903.png').decode().strip()!='5d1c8a8de32d4d172a167422e83a1aeb1e6165b1':
        raise RuntimeError('Historical avatar compatibility copy missing')
    style=git(SOURCE,'show','refs/heads/main:assets/css/layout.css').decode()
    if '../compat/corynelogo-20260903.png' not in style or '40ff096762bdf7646c9df721c49d052a39736cc0' in style:
        raise RuntimeError('Avatar still depends on old history')
    save(BACKUP/'original-refs.json',before)
    bundle=BACKUP/'original-tag.bundle'
    git(SOURCE,'bundle','create',str(bundle),TAG)
    git(SOURCE,'bundle','verify',str(bundle))
    digest=hashlib.sha256()
    with bundle.open('rb') as stream:
        for chunk in iter(lambda:stream.read(8*1024*1024),b''):digest.update(chunk)
    (BACKUP/'SHA256SUMS').write_text(digest.hexdigest()+'  original-tag.bundle\n')
    git(SOURCE,'clone','--mirror','--no-hardlinks',str(SOURCE),str(AFTER))
    pattern='^(?:'+'|'.join(re.escape(p) for p in sorted(config['paths']))+')$'
    subprocess.run([sys.executable,'-m','git_filter_repo','--force','--refs',TAG,
                    '--path-regex',pattern,'--invert-paths'],cwd=AFTER,check=True)
    after=refs(AFTER)
    if before.keys()!=after.keys() or any(after[r]!=s for r,s in before.items() if r!=TAG):
        raise RuntimeError('Unexpected reference change')
    if after[TAG]!=config['expectedNewTag']:
        raise RuntimeError('Filtered tag differs from independent simulation')
    old_tree=tree(SOURCE,TAG);new_tree=tree(AFTER,TAG);paths=set(config['paths'])
    if {p:v for p,v in old_tree.items() if p not in paths}!=new_tree:
        raise RuntimeError('Unexpected file change in historical tag')
    git(AFTER,'fsck','--full','--no-dangling')
    # Partial filtering retains origin; replace its mirror configuration before the explicit push.
    git(AFTER,'remote','remove','origin')
    git(AFTER,'remote','add','origin',URL)
    save(REPORT/'result.json',{'status':'validated-awaiting-backup-upload','tag':TAG,
         'oldTag':before[TAG],'newTag':after[TAG],'beforeRefs':before,
         'expectedRefs':after,'removedCurrentTagFiles':len(set(old_tree)&paths),
         'otherFilesUnchanged':True,'allBranchesUnchanged':True,
         'releaseAssetsUnchanged':True,'backupBundleSha256':digest.hexdigest()})
    print('Only the historical tag changes. All branches and other tag files preserved.')

def apply():
    result=json.loads((REPORT/'result.json').read_text())
    if result['status']!='validated-awaiting-backup-upload':raise RuntimeError('Invalid stage')
    if live_refs()!=result['beforeRefs']:raise RuntimeError('Remote changed; no push')
    git(AFTER,'push','--atomic','--force-with-lease='+TAG+':'+result['oldTag'],
        'origin',result['newTag']+':'+TAG,auth=True)
    actual=live_refs()
    if actual!=result['expectedRefs']:raise RuntimeError('Remote post-push verification differs')
    result.update(status='applied-and-verified',actualRefs=actual)
    save(REPORT/'result.json',result)
    with open(os.environ['GITHUB_STEP_SUMMARY'],'a') as summary:
        summary.write('## Historical catalogue tag compaction\n\nOne tag updated with exact lease. '
                      'All branches unchanged; all other files of the tag preserved. '
                      'The original tag history was uploaded before the push. Release assets unchanged.\n')
    print('Historical tag compacted and all remote refs verified.')

if __name__=='__main__':
    {'prepare':prepare,'apply':apply}[sys.argv[1]]()
