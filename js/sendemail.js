$(document).ready(addListener);

function addListener() {
    document.getElementById("email-send").addEventListener("click", sendEmail);
}


function sendEmail() {
    var form = new FormData(document.getElementById("email-form"));
    var subject = form.get("subject");
    var message = form.get("message");

    console.log("subject:\n\t", subject);
    console.log("message:\n\t", message);

    var url = "mailto:parkerwjackim@gmail.com?subject=" + subject + "&body=" + message;
    // var url = "mailto:abc@example.com?subject=Feedback&body=Message";


    window.open(url, '_blank');
}