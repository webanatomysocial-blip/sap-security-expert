<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { width: 80%; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; }
        .header { background: #f8fafc; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { padding: 20px; }
        .otp-box { background: #f1f5f9; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; border: 1px dashed #cbd5e1; }
        .footer { font-size: 12px; color: #64748b; text-align: center; margin-top: 20px; }
        .warning { color: #dc2626; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2 style="margin:0; color: #1e293b;">SAP Security Expert</h2>
        </div>
        <div class="content">
            <p>Hello <?php echo htmlspecialchars($name); ?>,</p>
            <p>You have requested to <span class="warning">permanently delete</span> your account at SAP Security Expert.</p>
            <p>To confirm this action, please use the following verification code:</p>
            
            <div class="otp-box">
                <?php echo $code; ?>
            </div>
            
            <p>This code will expire in 10 minutes. If you did not request this, please secure your account immediately.</p>
            <p class="warning">Important: This action is permanent and cannot be undone. All your personal data (except for your name on contributions) will be purged.</p>
        </div>
        <div class="footer">
            &copy; <?php echo $year; ?> SAP Security Expert. All rights reserved.
        </div>
    </div>
</body>
</html>
