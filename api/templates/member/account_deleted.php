<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { width: 80%; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; }
        .header { background: #f8fafc; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { padding: 20px; }
        .success-icon { color: #059669; font-size: 48px; text-align: center; margin-bottom: 20px; }
        .footer { font-size: 12px; color: #64748b; text-align: center; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2 style="margin:0; color: #1e293b;">SAP Security Expert</h2>
        </div>
        <div class="content">
            <div class="success-icon">&check;</div>
            <p>Hello <?php echo htmlspecialchars($name); ?>,</p>
            <p>This email confirms that your account at SAP Security Expert has been successfully deleted as per your request.</p>
            <p>Your personal data, including your email address, phone number, and location, has been removed from our active databases. Your name remains associated with any past blogs or comments you've contributed to maintain the integrity of our knowledge base.</p>
            <p>We're sorry to see you go. If you ever change your mind, you are welcome to sign up for a new account at any time.</p>
            <p>Best regards,<br>The SAP Security Expert Team</p>
        </div>
        <div class="footer">
            &copy; <?php echo $year; ?> SAP Security Expert. All rights reserved.
        </div>
    </div>
</body>
</html>
