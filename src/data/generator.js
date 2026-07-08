const firstNames = ['Aarav','Aditi','Aisha','Akash','Amit','Ananya','Anika','Anjali','Arjun','Aryan','Bhavna','Chetan','Deepa','Deepak','Dev','Divya','Esha','Gaurav','Geeta','Harsh','Isha','Jatin','Karan','Kavita','Kirti','Kunal','Lakshmi','Madhavi','Manish','Meera','Mohit','Nandini','Neha','Nikhil','Nisha','Omkar','Pallavi','Pooja','Pradeep','Pranav','Priya','Rahul','Rajesh','Rakesh','Ramesh','Ravi','Rekha','Ritika','Rohit','Ruchi','Sachin','Sahil','Sandeep','Sanjay','Sapna','Sarika','Shreya','Shubham','Simran','Sneha','Sonal','Sunil','Suresh','Tanvi','Tara','Usha','Varun','Vijay','Vikram','Vinay','Vinita','Vishal','Yash','Yogita'];
const lastNames = ['Agarwal','Bansal','Bhatt','Choudhary','Das','Desai','Deshpande','Gupta','Iyer','Jain','Joshi','Kapoor','Khanna','Kumar','Malhotra','Mehta','Menon','Mishra','Nair','Pandey','Patel','Pillai','Rao','Reddy','Roy','Saxena','Sethi','Shah','Sharma','Singh','Sinha','Srivastava','Thakur','Tiwari','Varma','Verma','Yadav'];
const depts = ['Development','QA & Testing','Design','HR','Finance','DevOps','Data Science','Product','Marketing','IT','Management','Recruitment'];
const designations = {
  Development: ['Junior Developer','Developer','Senior Developer','Lead Developer','Principal Engineer','Architect','Full Stack Developer','Frontend Developer','Backend Developer'],
  'QA & Testing': ['QA Analyst','QA Engineer','Senior QA Engineer','QA Lead','Automation Engineer'],
  Design: ['UI Designer','UX Designer','Senior Designer','Design Lead','Product Designer'],
  HR: ['HR Executive','HR Coordinator','HR Manager','HR Business Partner'],
  Finance: ['Accountant','Senior Accountant','Finance Analyst','Finance Manager','Finance Lead'],
  DevOps: ['DevOps Engineer','Senior DevOps Engineer','Cloud Engineer','SRE','DevOps Lead'],
  'Data Science': ['Data Analyst','Data Scientist','ML Engineer','Senior Data Scientist'],
  Product: ['Product Analyst','Product Manager','Senior PM','Director of Product'],
  Marketing: ['Marketing Executive','Content Writer','Digital Marketing Lead','Marketing Manager'],
  IT: ['IT Support','System Administrator','Network Engineer','IT Manager'],
  Management: ['CEO','CTO','VP Engineering','Director'],
  Recruitment: ['Recruiter','Senior Recruiter','Recruitment Lead','Talent Acquisition Manager'],
};
const locations = ['Hyderabad','Bangalore','Pune','Noida','Chennai','Mumbai','Gurgaon','Remote'];
const skills = ['React','Angular','Vue','Node.js','Python','Java','Spring Boot','AWS','Azure','Docker','Kubernetes','TypeScript','Next.js','GraphQL','MongoDB','PostgreSQL','Redis','Kafka','Terraform','Jenkins','Git','Figma','Selenium','Cypress','Jira','Confluence','Tailwind CSS','Material UI','Flutter','React Native','Go','Rust','C#','.NET','SQL','Power BI','Tableau','TensorFlow','PyTorch','Scrum','Agile'];
const statuses = ['Active','Active','Active','Active','Active','Active','Active','Active','On Leave','Notice Period'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function pickN(arr, n) { const s = new Set(); while (s.size < n && s.size < arr.length) s.add(pick(arr)); return [...s]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randDate(y1, y2) {
  const start = new Date(y1, 0, 1).getTime(), end = new Date(y2, 11, 31).getTime();
  return new Date(start + Math.random() * (end - start)).toISOString().split('T')[0];
}
function formatPhone() { return `+91 ${randInt(70000,99999)} ${randInt(10000,99999)}`; }

export function generateEmployees(count = 250) {
  const managers = [];
  return Array.from({ length: count }, (_, i) => {
    const dept = pick(depts);
    const desig = pick(designations[dept] || ['Employee']);
    const fn = pick(firstNames), ln = pick(lastNames);
    const name = `${fn} ${ln}`;
    const empId = `VKS${String(i + 100).padStart(3, '0')}`;
    const email = `${fn.toLowerCase()}.${ln.toLowerCase()}@vikisol.in`;
    const status = pick(statuses);
    const joinDate = randDate(2019, 2024);
    const ctc = randInt(4, 30) * 100000;
    const emp = {
      id: i + 1, empId, name, email, phone: formatPhone(), department: dept, designation: desig,
      status, location: pick(locations), joinDate, ctc,
      manager: i > 15 ? (managers.length > 0 ? pick(managers) : 'Syam Prabhakar Seeli') : 'Syam Prabhakar Seeli',
      skills: pickN(skills, randInt(2, 6)),
      dob: randDate(1985, 2000),
      gender: Math.random() > 0.45 ? 'Male' : 'Female',
      bloodGroup: pick(['A+','A-','B+','B-','O+','O-','AB+','AB-']),
      maritalStatus: pick(['Single','Married','Single','Single']),
      emergencyContact: { name: `${pick(firstNames)} ${pick(lastNames)}`, phone: formatPhone(), relation: pick(['Spouse','Parent','Sibling']) },
      address: `${randInt(1,500)}, ${pick(['MG Road','Park Street','Anna Nagar','Banjara Hills','Koramangala','Whitefield','Hinjewadi','Sector 62'])}, ${pick(locations)}`,
      pan: `${pick(['A','B','C','D'])}${pick(['A','B','C','D'])}PP${pick(['A','B','C','D'])}${randInt(1000,9999)}${pick(['A','B','C','D'])}`,
      aadhar: `${randInt(1000,9999)} ${randInt(1000,9999)} ${randInt(1000,9999)}`,
      bankAccount: `${randInt(100000000000, 999999999999)}`,
      bankName: pick(['HDFC Bank','ICICI Bank','SBI','Axis Bank','Kotak Bank']),
      ifsc: `${pick(['HDFC','ICIC','SBIN','UTIB'])}0${randInt(100000,999999)}`,
      education: [{ degree: pick(['B.Tech','M.Tech','BCA','MCA','B.Sc','M.Sc','MBA']), institution: pick(['IIT Delhi','NIT Warangal','JNTU','VIT','Anna University','IIM Bangalore','BITS Pilani']), year: randInt(2005,2022) }],
      experience: randInt(0, 15),
      probation: Math.random() > 0.8,
      employmentType: pick(['Full Time','Full Time','Full Time','Contract','Intern']),
      noticePeriod: pick(['30 days','60 days','90 days']),
    };
    if (desig.includes('Lead') || desig.includes('Manager') || desig.includes('Director') || desig.includes('Architect') || desig.includes('Senior')) {
      managers.push(name);
    }
    return emp;
  });
}

export function generateLeaveRequests(employees, count = 150) {
  const types = ['Casual Leave','Sick Leave','Earned Leave','Comp Off','Work From Home','Half Day'];
  const statusList = ['Pending','Approved','Rejected','Cancelled'];
  return Array.from({ length: count }, (_, i) => {
    const emp = pick(employees);
    const days = randInt(1, 7);
    const from = randDate(2024, 2024);
    const toDate = new Date(from);
    toDate.setDate(toDate.getDate() + days - 1);
    return {
      id: i + 1, empName: emp.name, empId: emp.empId, department: emp.department,
      type: pick(types), from, to: toDate.toISOString().split('T')[0], days,
      reason: pick(['Personal work','Not feeling well','Family event','Doctor appointment','Travel','Wedding','Festival','Emergency','Moving house','Vacation']),
      status: pick(statusList), appliedOn: randDate(2024, 2024),
      approver: pick(employees.filter(e => e.designation.includes('Manager') || e.designation.includes('Lead')))?.name || 'HR Manager',
    };
  });
}

export function generateTimesheets(employees, count = 300) {
  const projects = ['Vikisol Website Redesign','Mobile App Development','E-Commerce Platform','Data Analytics Dashboard','Cloud Migration','CRM System','API Gateway','Internal Tools','Client Portal','Payment Integration'];
  const tasks = ['UI Development','API Integration','Bug Fixing','Feature Development','Testing','Code Review','Documentation','Sprint Planning','Database Design','Deployment'];
  return Array.from({ length: count }, (_, i) => {
    const emp = pick(employees);
    const weekStart = randDate(2024, 2024);
    const hours = Array.from({ length: 7 }, () => randInt(0, 10));
    return {
      id: i + 1, empName: emp.name, empId: emp.empId, department: emp.department,
      project: pick(projects), task: pick(tasks),
      weekStart, hours, total: hours.reduce((a, b) => a + b, 0),
      status: pick(['Submitted','Approved','Rejected','Draft','Pending']),
      submittedOn: weekStart, approvedBy: pick(employees.filter(e => e.designation.includes('Manager')))?.name || 'Manager',
    };
  });
}

export function generateTickets(employees, count = 500) {
  const categories = ['Hardware','Software','Network','Email','VPN','Access','HR Issue','Payroll Issue','Facility','Travel','General','Laptop','Monitor','Printer'];
  const titles = {
    Hardware: ['Laptop keyboard not working','Mouse not responding','Headset audio issue','Laptop screen flickering','Charger not working','Webcam not detected'],
    Software: ['VS Code crashing','License expired','Software installation required','Update needed','App not loading','Plugin not working'],
    Network: ['WiFi connectivity issue','VPN disconnecting','Slow internet','Network printer not found','Port access needed'],
    Email: ['Email not syncing','Calendar not updating','Cannot send attachments','Distribution list access','Email quota exceeded'],
    VPN: ['VPN access required','VPN connection dropping','Cannot connect to VPN','VPN speed issue'],
    Access: ['GitHub access needed','Jira access required','AWS console access','Database access','Admin access request'],
    'HR Issue': ['Leave balance mismatch','Attendance correction needed','Policy clarification','Transfer request','ID card lost'],
    'Payroll Issue': ['Salary not credited','Tax declaration update','PF withdrawal','Bonus query','Reimbursement pending'],
    General: ['Air conditioning issue','Parking space request','Cafeteria feedback','Desk change request','Meeting room booking'],
  };
  return Array.from({ length: count }, (_, i) => {
    const cat = pick(categories);
    const titleList = titles[cat] || titles.General;
    const emp = pick(employees);
    return {
      id: `TKT-${String(i + 1).padStart(4, '0')}`, title: pick(titleList), category: cat,
      priority: pick(['Low','Medium','High','Critical']),
      status: pick(['Open','In Progress','Resolved','Closed','Waiting on User','Escalated']),
      raisedBy: emp.name, raisedByEmpId: emp.empId, raisedByDept: emp.department,
      assignee: pick(['IT Support Team','HR Team','Finance Team','Facilities Team','Network Team']),
      date: randDate(2024, 2024),
      description: `Issue reported by ${emp.name} from ${emp.department} department.`,
      comments: randInt(0, 8), attachments: randInt(0, 3),
      sla: pick(['4 hours','8 hours','24 hours','48 hours','72 hours']),
      resolution: pick([null, null, 'Issue resolved by replacing the hardware', 'Software reinstalled', 'Access granted', 'Configuration updated']),
    };
  });
}

export function generateCandidates(count = 100) {
  const roles = ['React Developer','Full Stack Developer','Backend Developer','QA Engineer','UX/UI Designer','DevOps Engineer','Data Scientist','Product Manager','Project Manager','Mobile Developer','Cloud Architect','ML Engineer'];
  const sources = ['LinkedIn','Naukri','Indeed','Referral','Company Website','Campus','Cutshort','Instahyre'];
  const stages = ['Applied','Screening','Technical','Manager','HR','Offered','Hired','Rejected'];
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1, name: `${pick(firstNames)} ${pick(lastNames)}`,
    email: `candidate${i + 1}@email.com`, phone: formatPhone(),
    role: pick(roles), experience: `${randInt(0, 15)} years`,
    currentCompany: pick(['TCS','Infosys','Wipro','HCL','Tech Mahindra','Accenture','Cognizant','Freelancer','Startup','Google','Amazon','Microsoft']),
    currentCTC: `₹${randInt(3, 40)}L`, expectedCTC: `₹${randInt(5, 50)}L`,
    stage: pick(stages), score: randInt(40, 98),
    source: pick(sources), appliedDate: randDate(2024, 2024),
    skills: pickN(skills, randInt(3, 6)), location: pick(locations),
    noticePeriod: pick(['Immediate','15 days','30 days','60 days','90 days']),
    status: pick(['Active','Shortlisted','Rejected','On Hold','Offered','Joined']),
    interviewer: `${pick(firstNames)} ${pick(lastNames)}`,
    feedback: pick([null, 'Strong technical skills', 'Good communication', 'Needs improvement in system design', 'Excellent problem solving', 'Good culture fit']),
    resume: 'resume.pdf',
  }));
}

export function generateProjects(count = 50) {
  const projectNames = ['E-Commerce Platform','CRM System','Mobile Banking App','Healthcare Portal','Learning Management','Inventory System','HR Analytics','Payment Gateway','Fleet Management','Supply Chain Portal','Real Estate Platform','Social Media Dashboard','IoT Dashboard','Chatbot Platform','Document Management','Video Conferencing','Food Delivery App','Travel Booking','Insurance Portal','Fintech App'];
  const clients = ['TechCorp','RetailMax','FinServ','MedTech','EduTech','LogiTech','Internal','StartupX','GlobalBank','InsureCo','AutoMotive Inc','GreenEnergy','FoodChain','TravelEase','HealthFirst'];
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1, name: i < projectNames.length ? projectNames[i] : `Project ${pick(projectNames)} v${randInt(2, 5)}`,
    client: pick(clients), status: pick(['On Track','On Track','On Track','At Risk','Delayed','Completed','On Hold']),
    progress: randInt(5, 100), team: randInt(2, 15),
    tech: pickN(skills.slice(0, 20), randInt(2, 5)),
    startDate: randDate(2023, 2024), deadline: randDate(2024, 2025),
    budget: `₹${randInt(5, 200)}L`, spent: `₹${randInt(2, 150)}L`,
    manager: `${pick(firstNames)} ${pick(lastNames)}`,
    description: `Enterprise ${pick(['web','mobile','cloud','data','AI'])} solution for ${pick(clients)}.`,
    priority: pick(['High','Medium','Low']),
    milestones: randInt(3, 12), completedMilestones: randInt(0, 8),
    risks: randInt(0, 5), sprints: randInt(1, 20),
    repository: `github.com/vikisol/project-${i + 1}`,
  }));
}

export function generateAssets(count = 200) {
  const types = [
    { type: 'Laptop', names: ['MacBook Pro 14"','MacBook Air M2','Dell XPS 15','ThinkPad X1 Carbon','HP EliteBook 840','Asus ZenBook'] },
    { type: 'Monitor', names: ['Dell 27" 4K','LG 27" UltraFine','Samsung 32" Curved','BenQ PD2700U','ASUS ProArt'] },
    { type: 'Keyboard', names: ['Logitech MX Keys','Apple Magic Keyboard','Keychron K3','Dell KB522','Microsoft Ergonomic'] },
    { type: 'Mouse', names: ['Logitech MX Master 3','Apple Magic Mouse','Logitech M720','Microsoft Arc','Razer DeathAdder'] },
    { type: 'Headset', names: ['Jabra Evolve2 75','Sony WH-1000XM5','Bose 700','Apple AirPods Max','Poly Voyager'] },
    { type: 'ID Card', names: ['Employee Badge'] },
    { type: 'SIM', names: ['Airtel Corporate','Jio Business','Vodafone Enterprise'] },
    { type: 'Software License', names: ['Microsoft 365','Adobe CC','JetBrains All','Figma Pro','Slack Business','Zoom Pro','GitHub Enterprise'] },
    { type: 'Access Card', names: ['Office Access Card','Parking Card','Server Room Card'] },
  ];
  return Array.from({ length: count }, (_, i) => {
    const cat = pick(types);
    return {
      id: i + 1, type: cat.type, name: pick(cat.names),
      serial: `${cat.type.substring(0, 3).toUpperCase()}-${randInt(2020, 2024)}-${String(i + 1).padStart(4, '0')}`,
      assignedTo: Math.random() > 0.15 ? `${pick(firstNames)} ${pick(lastNames)}` : null,
      status: pick(['Assigned','Available','Under Repair','Disposed','In Transit']),
      assignedDate: Math.random() > 0.15 ? randDate(2022, 2024) : null,
      purchaseDate: randDate(2020, 2024),
      warranty: `${randInt(1, 3)} years`,
      cost: `₹${randInt(500, 200000).toLocaleString()}`,
      vendor: pick(['Amazon Business','Croma','Dell Direct','Apple Store','Flipkart','HP Store']),
      location: pick(locations),
      condition: pick(['Excellent','Good','Fair','Needs Repair']),
    };
  });
}

export function generatePayslips(employees) {
  return employees.filter(e => e.status === 'Active').map((emp, i) => {
    const basic = Math.round(emp.ctc / 12 * 0.5);
    const hra = Math.round(basic * 0.4);
    const special = Math.round(emp.ctc / 12 - basic - hra);
    const pf = Math.round(basic * 0.12);
    const totalEarnings = basic + hra + special;
    // A flat professional-tax deduction charged against a zero/near-zero gross (e.g. a test
    // account with no CTC configured) could push netPay negative - same guard already applied
    // on the live backend's payroll run (PayrollService.java), mirrored here for the mock/demo
    // dataset so the "Lowest Salary" stat never shows an impossible negative number.
    const pt = totalEarnings > 0 ? 200 : 0;
    const tax = Math.round(emp.ctc > 1000000 ? emp.ctc / 12 * 0.1 : emp.ctc > 500000 ? emp.ctc / 12 * 0.05 : 0);
    const totalDeductions = pf + pt + tax;
    return {
      id: i + 1, empId: emp.empId, empName: emp.name, department: emp.department,
      designation: emp.designation, month: 'May 2024', ctc: emp.ctc,
      earnings: [{ component: 'Basic Salary', amount: basic }, { component: 'HRA', amount: hra }, { component: 'Special Allowance', amount: special }],
      deductions: [{ component: 'Provident Fund', amount: pf }, { component: 'Professional Tax', amount: pt }, { component: 'Income Tax', amount: tax }],
      totalEarnings, totalDeductions, netPay: Math.max(0, totalEarnings - totalDeductions),
      bankAccount: emp.bankAccount, bankName: emp.bankName,
      status: pick(['Paid','Paid','Paid','Paid','Processing']),
    };
  });
}

export function generateDocuments(count = 100) {
  const docTypes = [
    { name: 'Offer Letter', category: 'Employment' },
    { name: 'Appointment Letter', category: 'Employment' },
    { name: 'NDA Agreement', category: 'Legal' },
    { name: 'Increment Letter', category: 'Compensation' },
    { name: 'Promotion Letter', category: 'Employment' },
    { name: 'Experience Letter', category: 'Employment' },
    { name: 'Relieving Letter', category: 'Employment' },
    { name: 'Health Insurance Policy', category: 'Benefits' },
    { name: 'Employee Handbook', category: 'Policy' },
    { name: 'Leave Policy', category: 'Policy' },
    { name: 'Code of Conduct', category: 'Policy' },
    { name: 'Appraisal Letter', category: 'Performance' },
    { name: 'Warning Letter', category: 'Disciplinary' },
    { name: 'Training Certificate', category: 'Training' },
    { name: 'Salary Revision Letter', category: 'Compensation' },
    { name: 'Transfer Letter', category: 'Employment' },
    { name: 'Bonafide Certificate', category: 'General' },
    { name: 'No Objection Certificate', category: 'General' },
  ];
  return Array.from({ length: count }, (_, i) => {
    const doc = pick(docTypes);
    return {
      id: i + 1, name: `${doc.name}${i > docTypes.length ? ` - ${randInt(2020, 2024)}` : ''}`,
      type: 'PDF', category: doc.category,
      date: randDate(2020, 2024), size: `${randInt(100, 3000)} KB`,
      uploadedBy: `${pick(firstNames)} ${pick(lastNames)}`,
      status: pick(['Active','Archived','Pending Approval','Draft']),
      version: `v${randInt(1, 5)}.0`,
      employee: `${pick(firstNames)} ${pick(lastNames)}`,
      empId: `VKS${randInt(100, 350)}`,
      signed: Math.random() > 0.3,
    };
  });
}

export function generateAnnouncements() {
  return [
    { id: 1, title: 'Company Town Hall - Q2 2024', content: 'Join us for the quarterly town hall meeting to discuss company updates, achievements, and roadmap.', date: '2024-05-20', priority: 'high', author: 'Syam Prabhakar Seeli', department: 'Management', readBy: 180 },
    { id: 2, title: 'New Health Insurance Policy', content: 'Updated health insurance benefits for all employees starting June 2024.', date: '2024-05-18', priority: 'medium', author: 'Priya Sharma', department: 'HR', readBy: 220 },
    { id: 3, title: 'Office Renovation - Hyderabad', content: 'Our Hyderabad office is getting a fresh new look. Temporary seating arrangements from June 1-15.', date: '2024-05-15', priority: 'low', author: 'Admin Team', department: 'Admin', readBy: 145 },
    { id: 4, title: 'Annual Day Celebration', content: 'Save the date! Annual Day celebration on July 15, 2024 at Novotel Hyderabad.', date: '2024-05-12', priority: 'medium', author: 'HR Team', department: 'HR', readBy: 195 },
    { id: 5, title: 'New Project Launch - FinTech Platform', content: 'Exciting new project starting with a leading financial services client.', date: '2024-05-10', priority: 'high', author: 'Rohit Sharma', department: 'Development', readBy: 120 },
  ];
}

export function generateNotifications() {
  const types = ['leave','interview','payroll','project','asset','system','announcement','birthday','anniversary'];
  const msgs = {
    leave: ['Leave request from {name} - {days} days','Leave approved for {name}','Leave rejected for {name}'],
    interview: ['Interview scheduled with {name}','{name} cleared technical round','Offer sent to {name}'],
    payroll: ['May 2024 payroll processed','Salary credited for {name}','Tax declaration deadline approaching'],
    project: ['Sprint review meeting at 3 PM','{name} deployed to production','Project milestone achieved'],
    asset: ['Laptop assigned to {name}','Asset return pending from {name}','New assets received'],
    system: ['System maintenance scheduled','Password expiry reminder','Security update available'],
    announcement: ['New company policy published','Town hall meeting tomorrow','Holiday list updated'],
    birthday: ["{name}'s birthday today!","Wish {name} a happy birthday"],
    anniversary: ['{name} completes 3 years today','{name} work anniversary'],
  };
  return Array.from({ length: 50 }, (_, i) => {
    const type = pick(types);
    const msg = pick(msgs[type]).replace(/{name}/g, `${pick(firstNames)} ${pick(lastNames)}`).replace(/{days}/g, randInt(1, 5));
    return { id: i + 1, message: msg, type, read: Math.random() > 0.4, time: `${randInt(1, 59)} mins ago`, date: randDate(2024, 2024) };
  });
}

export function generateHolidays() {
  return [
    { id: 1, date: '2024-01-26', name: 'Republic Day', type: 'National', optional: false },
    { id: 2, date: '2024-03-25', name: 'Holi', type: 'Festival', optional: false },
    { id: 3, date: '2024-03-29', name: 'Good Friday', type: 'Religious', optional: true },
    { id: 4, date: '2024-04-11', name: 'Ugadi', type: 'Regional', optional: false },
    { id: 5, date: '2024-04-17', name: 'Ram Navami', type: 'Festival', optional: true },
    { id: 6, date: '2024-05-01', name: 'May Day', type: 'National', optional: false },
    { id: 7, date: '2024-06-17', name: 'Eid ul-Adha', type: 'Religious', optional: true },
    { id: 8, date: '2024-08-15', name: 'Independence Day', type: 'National', optional: false },
    { id: 9, date: '2024-08-26', name: 'Janmashtami', type: 'Festival', optional: true },
    { id: 10, date: '2024-09-16', name: 'Milad un-Nabi', type: 'Religious', optional: true },
    { id: 11, date: '2024-10-02', name: 'Gandhi Jayanti', type: 'National', optional: false },
    { id: 12, date: '2024-10-12', name: 'Dussehra', type: 'Festival', optional: false },
    { id: 13, date: '2024-11-01', name: 'Diwali', type: 'Festival', optional: false },
    { id: 14, date: '2024-11-02', name: 'Diwali (Day 2)', type: 'Festival', optional: false },
    { id: 15, date: '2024-11-15', name: 'Guru Nanak Jayanti', type: 'Religious', optional: true },
    { id: 16, date: '2024-12-25', name: 'Christmas', type: 'National', optional: false },
  ];
}
