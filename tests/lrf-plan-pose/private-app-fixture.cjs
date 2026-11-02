// Test-only editor fixture. Public production navigation must use the gate.
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
module.exports=page=>page.route('**/lrf-plan-pose.html',route=>route.fulfill({status:200,contentType:'text/html',body:readFileSync(resolve(__dirname,'../../functions/plan-pose/application.html'),'utf8')}));
