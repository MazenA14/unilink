import { parseStaffListHtml } from './parsers/staffListParser';

// Test with the actual data structure you provided
const realDataHtml = `
<!DOCTYPE html>
<html>
<head><title>GUC Staff List</title></head>
<body>
<script type="text/javascript">
var courses = [{
    'id': '1155',
    'value': 'ABSK 901: Academic Business Skills I'
}, {
    'id': '1156',
    'value': 'ABSK 902: Academic Business Skills II'
}, {
    'id': '13',
    'value': 'AE 101: Introduction to Academic English (B)'
}, {
    'id': '2989',
    'value': 'ANTM 102: Human Anatomy I'
}, {
    'id': '2954',
    'value': 'ARAB 203: Arabic For Law I (A)'
}, {
    'id': '2955',
    'value': 'ARAB 204: Arabic For Law I (B)'
}, {
    'id': '1786',
    'value': 'ARCH  702: Legislation, Professional Practice and contracts'
}, {
    'id': '1417',
    'value': 'ARCH 101: Freehand Drawing and Modelling'
}, {
    'id': '1418',
    'value': 'ARCH 102: Descriptive Geometry'
}, {
    'id': '1419',
    'value': 'ARCH 103: Fundamentals of Building Technology (Building Physics and Building Structures)'
}];

var tas = [{
    'id': '3064',
    'value': 'Abdel Megid Mahmoud Allam'
}, {
    'id': '6851',
    'value': 'Abdel Rahman Hatem ElSayed Mansour ElBarshoumy'
}, {
    'id': '9199',
    'value': 'Abdelaziz Mahmoud Awadallah Ali Hassan Gohar'
}, {
    'id': '8891',
    'value': 'Abdelrahman  Nagy Bakr Mohamed Ramdan Halawa '
}, {
    'id': '9651',
    'value': 'Abdelrahman Atef Saad Hamada  Saleh'
}, {
    'id': '6416',
    'value': 'Abdelrahman Islam Ahmed Mahmoud'
}, {
    'id': '9620',
    'value': 'Abdelrahman Mohammed Elsaied Darwish'
}, {
    'id': '8259',
    'value': 'Abdelrahman Nour Mohamed Hassan Abdallah'
}, {
    'id': '8283',
    'value': 'Abdelrahman Salah Salama Mohamed Ghoneim'
}, {
    'id': '9645',
    'value': 'Abdelrhman Emadeldin Ahmed Fouad Hassauba'
}];
</script>
</body>
</html>
`;

export function testParserWithRealData() {
  try {
    console.log('Testing parser with real data structure...');
    const result = parseStaffListHtml(realDataHtml);
    
    console.log('✅ Parser test successful!');
    console.log(`📚 Found ${result.courses.length} courses`);
    console.log(`👨‍🏫 Found ${result.tas.length} TAs`);
    
    // Show first few examples
    console.log('\n📚 First 3 courses:');
    result.courses.slice(0, 3).forEach((course, index) => {
      console.log(`  ${index + 1}. ${course.name} (${course.department}) - ${course.additionalInfo}`);
    });
    
    console.log('\n👨‍🏫 First 3 TAs:');
    result.tas.slice(0, 3).forEach((ta, index) => {
      console.log(`  ${index + 1}. ${ta.name} (${ta.department}) - ${ta.additionalInfo}`);
    });
    
    return result;
  } catch (error) {
    console.error('❌ Parser test failed:', error);
    throw error;
  }
}

// Export the test HTML for use in other tests
export { realDataHtml };
