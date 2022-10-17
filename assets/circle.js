// Get circle parameters
var circle = document.querySelector('circle.progress');
var radius = circle.r.baseVal.value;
var circumference = radius * 2 * Math.PI;

var originX = circle.cx.baseVal.value;
var originY = circle.cy.baseVal.value;

var user_score = document.querySelector('text.user-score');

var handle = document.querySelector('circle.handle');
var coords = document.querySelector('div.coords');

// Assign initial stroke settings based on the circumference
circle.style.strokeDasharray = `${circumference} ${circumference}`;
circle.style.strokeDashoffset = `${circumference}`;

// Change the progress amount between 0 to 100
// We reverse the percentage and subtract circumference to go counter-clockwise.
function setProgress(percent) {
  
  // For debugging, adjust the number to match the percentage. In production the percentage is just based on the amount.
  user_score.innerHTML = Math.round( ((percent/100) * 5) * 10 ) / 10;
  
  var reverse_percent = 100 - percent;
  const offset = reverse_percent / 100 * circumference;
  
  circle.style.strokeDashoffset = -1 * offset;
  
  setHandleRotation(percent);
}
 
// Position the handle at the end of the stroke
// Percent will be between 0 to 100.
function setHandleRotation(percent) {
  // 0% = 90 degrees
  // 25% = 180 degrees
  // 50% = 270 degrees
  // 75% = 360 degrees
  // 100% = 90 degrees (same as 0%)
  var angle = (180 + (percent*3.6) ) % 360;

  // Convert degrees to radians
  var angle_radians = angle * Math.PI / 180;

  var xOffset = radius * ( Math.sin( angle_radians ) );
  var yOffset = radius * ( Math.cos( angle_radians ) );

  var x = originX + xOffset;
  var y = originY + yOffset;

  handle.attributes.cx.value = x;
  handle.attributes.cy.value = y; 

  coords.innerHTML = 
    'Percent: ' + percent + '<br>' +
    'Center X: ' + originX + '<br>' +
    'Center Y: ' + originY + '<br>' +
    'Angle (Degrees): ' + angle + '<br>' +
    'Angle (Radians): ' + (Math.round(100*angle_radians)/100) + '<br>' +
    'X: ' + (Math.round(100*x)/100) + '<br>' +
    'Y: ' + (Math.round(100*y)/100) + '<br>' 
  ;

  console.log( angle, xOffset, yOffset );
}

// DEBUG: Use input to change value 
const input = document.querySelector('input');
input.value = Math.round( Math.random() * 100 ); // initialize with random percentage
setProgress(input.value);
input.addEventListener('change', function(e) {
  if (input.value < 101 && input.value > -1) {
    setProgress(input.value);
  }  
})