import { SMTP_EMAIL_ADDRESS, SMTP_EMAIL_PASSWORD, SMTP_HOST, SMTP_PORT } from "$env/static/private";
import { createTransport } from "nodemailer";

const transporter = createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    auth: {
        user: SMTP_EMAIL_ADDRESS,
        pass: SMTP_EMAIL_PASSWORD
    }
});

export const sendPasswordResetEmail = async (userAccount, oneTimeTokenValue) => {
    let formatted = `Hi ${userAccount.firstName}! <br><br>
    A request to reset your password has been received.<br>
    If this was not you, you can safely ignore this email.<br><br><br>
    
    <a href="http://localhost:5173/confirm-password-reset?token=${oneTimeTokenValue}">Reset Password</a>`;

    const mailOptions = {
        from: SMTP_EMAIL_ADDRESS,
        to: userAccount.emailAddress,
        subject: `Password Reset Requested`,
        html: formatted
    };

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
        } else {
            console.log("Email sent: " + info.response);
        }
    });
};
