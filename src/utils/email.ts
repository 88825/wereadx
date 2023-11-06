const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!

const template1 = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>通知</title>
    <style>
        a {
            color: black;
        }
        .link {
            color: blue;
        }
    </style>
</head>
<body>
<h2>绑定邮箱通知</h2>
<p>您正在请求绑定该邮箱用于 WeReadX(<a href="https://weread.deno.dev/">https://weread.deno.dev/</a>) 发送通知消息之目的。</p>
<p>若同意绑定，请点击下面的链接。</p>
<a class="link" href="__NOTIFY_URL__" target="_blank">__NOTIFY_URL__</a>

<p>若不是您发起的请求，请忽略该邮件。</p>
</body>
</html>
`

export function getEmailVerifyHtml(notifyUrl: string) {
    return template1.replace(/__NOTIFY_URL__/g, notifyUrl)
}

/**
 * 发送电子邮件
 * @param receiver 接收者邮箱
 * @param subject 主题
 * @param html 邮件内容
 */
export async function sendEmail(receiver: string, subject: string, html: string) {
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`
        },
        body: JSON.stringify({
            from: 'WeReadX提醒 <wereadx@notify.champ.design>',
            to: receiver,
            subject: subject,
            html: html,
        })
    });

    if (res.ok) {
        return await res.json()
    } else {
        console.warn(`邮件发送失败: (${receiver}:${subject}:${res.status})`)
        return false
    }
}
