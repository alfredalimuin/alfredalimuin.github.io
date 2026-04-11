const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('d:/Agentic code/n8n builder/dental_current.json'));

const newNodes = [
  {
    id: 'cancel-webhook',
    name: 'Cancel Appointment',
    type: 'n8n-nodes-base.webhook',
    typeVersion: 2,
    position: [0, 600],
    webhookId: 'dental-cancel-appt-001',
    parameters: { httpMethod: 'POST', path: 'dental-cancel', responseMode: 'responseNode', options: {} }
  },
  {
    id: 'cancel-extract',
    name: 'Extract Cancel Data',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [240, 600],
    parameters: {
      jsCode: "const body = $input.first().json.body || $input.first().json;\nconst message = body.message || {};\nconst toolCallList = message.toolCallList || message.tool_call_list || [];\nconst toolCall = toolCallList[0] || {};\nconst funcArgs = toolCall.function ? toolCall.function.arguments : null;\nlet args = {};\nif (funcArgs) {\n  try { args = JSON.parse(funcArgs); } catch(e) { args = funcArgs; }\n}\nif (!args.email && body.email) { args = body; }\nconst apptType = (args.appointment_type || args.appointmentType || '').toLowerCase().trim();\nreturn [{\n  json: {\n    tool_call_id: toolCall.id || '',\n    patient_name: args.patient_name || args.patientName || '',\n    email: args.email || '',\n    appointment_type: apptType,\n    preferred_date: args.preferred_date || args.preferredDate || '',\n    call_id: (message.call && message.call.id) ? message.call.id : (body.call_id || '')\n  }\n}];"
    }
  },
  {
    id: 'cancel-build-response',
    name: 'Build Cancel Response',
    type: 'n8n-nodes-base.set',
    typeVersion: 3.4,
    position: [480, 600],
    parameters: {
      assignments: {
        assignments: [{
          id: 'cr1',
          name: 'vapi_response',
          value: "={{ JSON.stringify({ results: [{ toolCallId: $('Extract Cancel Data').first().json.tool_call_id, result: 'Your appointment has been successfully cancelled. A confirmation email will be sent to ' + $('Extract Cancel Data').first().json.email + '.' }] }) }}",
          type: 'string'
        }]
      },
      options: {}
    }
  },
  {
    id: 'cancel-respond',
    name: 'Respond to VAPI (Cancel)',
    type: 'n8n-nodes-base.respondToWebhook',
    typeVersion: 1,
    position: [720, 600],
    parameters: {
      respondWith: 'text',
      responseBody: '={{ $json.vapi_response }}',
      options: { responseCode: 200, responseHeaders: { entries: [{ name: 'Content-Type', value: 'application/json' }] } }
    }
  },
  {
    id: 'cancel-route',
    name: 'Route Cancel by Type',
    type: 'n8n-nodes-base.switch',
    typeVersion: 3,
    position: [960, 600],
    parameters: {
      mode: 'rules',
      rules: {
        values: [
          {
            conditions: { options: { caseSensitive: false }, conditions: [{ id: 'cr1', leftValue: "={{ $('Extract Cancel Data').first().json.appointment_type }}", rightValue: 'aesthetic', operator: { type: 'string', operation: 'contains' } }], combinator: 'and' },
            renameOutput: true, outputKey: 'Aesthetic Surgery'
          },
          {
            conditions: { options: { caseSensitive: false }, conditions: [{ id: 'cr2', leftValue: "={{ $('Extract Cancel Data').first().json.appointment_type }}", rightValue: 'dental surgery', operator: { type: 'string', operation: 'contains' } }], combinator: 'and' },
            renameOutput: true, outputKey: 'Dental Surgery'
          }
        ]
      },
      options: { fallbackOutput: 'extra' }
    }
  },
  {
    id: 'cancel-read-aesthetic',
    name: 'Read Aesthetic Surgery Sheet',
    type: 'n8n-nodes-base.googleSheets',
    typeVersion: 4.7,
    position: [1200, 400],
    credentials: { googleSheetsOAuth2Api: { id: 'yckosmzREOuRBfaJ', name: 'Google Sheets account 2' } },
    parameters: {
      operation: 'getAll',
      documentId: { __rl: true, value: 'REPLACE_WITH_SHEET_URL', mode: 'url' },
      sheetName: { __rl: true, value: 'Aesthetic Surgery', mode: 'name' },
      filtersUI: {},
      options: {}
    }
  },
  {
    id: 'cancel-read-dental-surg',
    name: 'Read Dental Surgery Sheet',
    type: 'n8n-nodes-base.googleSheets',
    typeVersion: 4.7,
    position: [1200, 600],
    credentials: { googleSheetsOAuth2Api: { id: 'yckosmzREOuRBfaJ', name: 'Google Sheets account 2' } },
    parameters: {
      operation: 'getAll',
      documentId: { __rl: true, value: 'REPLACE_WITH_SHEET_URL', mode: 'url' },
      sheetName: { __rl: true, value: 'Dental Surgery', mode: 'name' },
      filtersUI: {},
      options: {}
    }
  },
  {
    id: 'cancel-read-checkup',
    name: 'Read Dental Checkup Sheet',
    type: 'n8n-nodes-base.googleSheets',
    typeVersion: 4.7,
    position: [1200, 800],
    credentials: { googleSheetsOAuth2Api: { id: 'yckosmzREOuRBfaJ', name: 'Google Sheets account 2' } },
    parameters: {
      operation: 'getAll',
      documentId: { __rl: true, value: 'REPLACE_WITH_SHEET_URL', mode: 'url' },
      sheetName: { __rl: true, value: 'Dental Checkup', mode: 'name' },
      filtersUI: {},
      options: {}
    }
  },
  {
    id: 'cancel-merge-reads',
    name: 'Merge Sheet Reads',
    type: 'n8n-nodes-base.merge',
    typeVersion: 3,
    position: [1440, 600],
    parameters: { mode: 'append' }
  },
  {
    id: 'cancel-find-row',
    name: 'Find Appointment Row',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [1680, 600],
    parameters: {
      jsCode: "const items = $input.all();\nconst cancelData = $('Extract Cancel Data').first().json;\nconst targetEmail = (cancelData.email || '').toLowerCase().trim();\nconst targetDate = (cancelData.preferred_date || '').trim();\n\nconst match = items.find(item => {\n  const rowEmail = (item.json['Email'] || '').toLowerCase().trim();\n  const rowDate = (item.json['Preferred Date'] || '').trim();\n  return rowEmail === targetEmail && (!targetDate || rowDate === targetDate);\n}) || items.find(item => {\n  return (item.json['Email'] || '').toLowerCase().trim() === targetEmail;\n});\n\nif (!match) {\n  return [{ json: { found: false, event_id: '', patient_name: cancelData.patient_name, email: cancelData.email, appointment_type: cancelData.appointment_type, preferred_date: cancelData.preferred_date, preferred_time: '' } }];\n}\n\nreturn [{ json: {\n  found: true,\n  event_id: match.json['Calendar Event ID'] || '',\n  patient_name: match.json['Patient Name'] || cancelData.patient_name,\n  email: match.json['Email'] || cancelData.email,\n  appointment_type: match.json['Appointment Type'] || cancelData.appointment_type,\n  preferred_date: match.json['Preferred Date'] || cancelData.preferred_date,\n  preferred_time: match.json['Preferred Time'] || ''\n}}];"
    }
  },
  {
    id: 'cancel-delete-event',
    name: 'Delete Calendar Event',
    type: 'n8n-nodes-base.googleCalendar',
    typeVersion: 1,
    position: [1920, 600],
    parameters: {
      operation: 'delete',
      calendar: { __rl: true, value: 'primary', mode: 'list', cachedResultName: 'primary' },
      eventId: '={{ $json.event_id }}'
    }
  },
  {
    id: 'cancel-email',
    name: 'Send Cancellation Email',
    type: 'n8n-nodes-base.gmail',
    typeVersion: 2.2,
    position: [2160, 600],
    credentials: { gmailOAuth2: { id: 'wKj9godSk3wUw4lk', name: 'Gmail account 2' } },
    parameters: {
      resource: 'message',
      operation: 'send',
      sendTo: "={{ $('Find Appointment Row').first().json.email }}",
      subject: "=Appointment Cancelled — {{ $('Find Appointment Row').first().json.appointment_type }}",
      message: "=<div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto'><h2 style='color:#d93025;border-bottom:2px solid #d93025;padding-bottom:8px'>Appointment Cancelled</h2><p>Dear <strong>{{ $('Find Appointment Row').first().json.patient_name }}</strong>,</p><p>Your appointment has been successfully cancelled. Here are the details of the cancelled booking:</p><table style='border-collapse:collapse;width:100%;margin:16px 0'><tr style='background:#f8f9fa'><td style='padding:10px;border:1px solid #ddd;font-weight:bold;width:40%'>Appointment Type</td><td style='padding:10px;border:1px solid #ddd'>{{ $('Find Appointment Row').first().json.appointment_type }}</td></tr><tr><td style='padding:10px;border:1px solid #ddd;font-weight:bold'>Date</td><td style='padding:10px;border:1px solid #ddd'>{{ $('Find Appointment Row').first().json.preferred_date }}</td></tr><tr style='background:#f8f9fa'><td style='padding:10px;border:1px solid #ddd;font-weight:bold'>Time</td><td style='padding:10px;border:1px solid #ddd'>{{ $('Find Appointment Row').first().json.preferred_time }}</td></tr></table><p style='color:#555'>We hope to see you again soon. To rebook, please call us.</p><hr style='border:none;border-top:1px solid #eee;margin:24px 0'><p style='color:#999;font-size:12px'>This is an automated cancellation notice. Please do not reply to this email.</p></div>",
      options: {}
    }
  }
];

const newConns = {
  'Cancel Appointment': { main: [[{ node: 'Extract Cancel Data', type: 'main', index: 0 }]] },
  'Extract Cancel Data': { main: [[{ node: 'Build Cancel Response', type: 'main', index: 0 }]] },
  'Build Cancel Response': { main: [[{ node: 'Respond to VAPI (Cancel)', type: 'main', index: 0 }]] },
  'Respond to VAPI (Cancel)': { main: [[{ node: 'Route Cancel by Type', type: 'main', index: 0 }]] },
  'Route Cancel by Type': { main: [
    [{ node: 'Read Aesthetic Surgery Sheet', type: 'main', index: 0 }],
    [{ node: 'Read Dental Surgery Sheet', type: 'main', index: 0 }],
    [{ node: 'Read Dental Checkup Sheet', type: 'main', index: 0 }]
  ]},
  'Read Aesthetic Surgery Sheet': { main: [[{ node: 'Merge Sheet Reads', type: 'main', index: 0 }]] },
  'Read Dental Surgery Sheet': { main: [[{ node: 'Merge Sheet Reads', type: 'main', index: 1 }]] },
  'Read Dental Checkup Sheet': { main: [[{ node: 'Merge Sheet Reads', type: 'main', index: 2 }]] },
  'Merge Sheet Reads': { main: [[{ node: 'Find Appointment Row', type: 'main', index: 0 }]] },
  'Find Appointment Row': { main: [[{ node: 'Delete Calendar Event', type: 'main', index: 0 }]] },
  'Delete Calendar Event': { main: [[{ node: 'Send Cancellation Email', type: 'main', index: 0 }]] }
};

wf.nodes = [...wf.nodes, ...newNodes];
wf.connections = { ...wf.connections, ...newConns };

// Remove read-only fields
['active','updatedAt','createdAt','isArchived','versionCounter','triggerCount','shared','tags','activeVersion','staticData','meta','pinData'].forEach(k => delete wf[k]);

fs.writeFileSync('d:/Agentic code/n8n builder/dental_updated.json', JSON.stringify(wf));
console.log('Done. Nodes:', wf.nodes.length, 'Connections:', Object.keys(wf.connections).length);
