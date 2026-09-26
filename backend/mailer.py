import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import requests


def build_email_html(title, code):
    return f"""
    <div style="background:#0a0a0a;color:#ffffff;border-radius:12px;padding:40px 24px;
                text-align:center;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;">
      <p style="font-size:20px;font-weight:600;letter-spacing:-0.02em;margin:0 0 8px;">yo</p>
      <p style="color:#a1a1a1;font-size:14px;margin:0 0 24px;">{title}</p>
      <p style="font-size:36px;font-weight:700;letter-spacing:8px;margin:0 0 24px;">{code}</p>
      <p style="color:#737373;font-size:12px;margin:0;">
        This code expires soon. If you didn't request it, ignore this email.
      </p>
    </div>
    """


def send_email(to, subject, html):
    resend_key = os.getenv("RESEND_API_KEY")
    if resend_key:
        resp = requests.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {resend_key}"},
            json={
                "from": os.getenv("EMAIL_FROM", "YO <onboarding@resend.dev>"),
                "to": [to],
                "subject": subject,
                "html": html,
            },
            timeout=10,
        )
        resp.raise_for_status()
        return

    host = os.getenv("SMTP_HOST")
    if not host:
        raise RuntimeError("No email provider configured (RESEND_API_KEY or SMTP_HOST)")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = os.getenv("EMAIL_FROM", "YO <no-reply@example.com>")
    msg["To"] = to
    msg.attach(MIMEText(html, "html"))
    with smtplib.SMTP(host, int(os.getenv("SMTP_PORT", "587")), timeout=15) as smtp:
        smtp.starttls()
        smtp.login(os.getenv("SMTP_USER"), os.getenv("SMTP_PASS"))
        smtp.send_message(msg)