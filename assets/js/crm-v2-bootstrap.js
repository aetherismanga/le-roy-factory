// Presentation bootstrap. Data access continues through the existing authenticated gate.
import './crm-v2-shell.js';
import { waitForAgent } from './firebase.js?v=20261023-crm-audit1';
import { startDailyWelcome } from './crm-daily-welcome.js';
startDailyWelcome({ getProfile: waitForAgent });
