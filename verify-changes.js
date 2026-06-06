const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\srini\\Documents\\Wispr-Stories\\wisprstories.js', 'utf8');
console.log('updateCard has speechLang check:', content.includes('hasValidSpeechLang'));
console.log('updateCard has btnC disabled:', content.includes('btnC.disabled'));
console.log('canCreateCard has speechLang check:', content.includes('!speechLang'));
console.log('updateSlTrigger calls updateCard:', content.includes('updateCard(); // Refresh card label'));
console.log('Label spans present:', content.includes('card-label-name') && content.includes('card-label-lang') && content.includes('card-label-sep'));
console.log('Serif font for Latin:', content.includes('tx.style.fontFamily = "var(--serif)"'));
console.log('detectScript used:', content.includes('detectScript(displayText)'));