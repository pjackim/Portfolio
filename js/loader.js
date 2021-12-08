$(document).ready(loadHeader);
$(document).ready(loadPort);

function loadHeader() { $("#headersection").load("html/header.html"); }
function loadPort() { $("#portfoliosection").load("html/portfolio.html"); }