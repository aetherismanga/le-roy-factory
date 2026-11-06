import {fetchPhotoStudioModel} from './fetch-photo-studio-model.mjs';
import {buildPublicSite} from './build-public-site.mjs';

// Dedicated preview build: do not alter the existing production/workspace builds.
await fetchPhotoStudioModel();
await buildPublicSite();
