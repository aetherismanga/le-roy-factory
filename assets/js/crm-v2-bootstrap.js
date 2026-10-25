// Presentation bootstrap. Data access continues through the existing authenticated gate.
import './crm-v2-shell.js';
import { waitForAgent } from './firebase.js?v=20261023-crm-audit1';
import { startDailyWelcome } from './crm-daily-welcome.js';
import { startAgentMusic } from './crm-v2-agent-music.js';
startDailyWelcome({ getProfile: waitForAgent });
startAgentMusic({ getProfile: waitForAgent });
