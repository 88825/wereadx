import {checkLogin, handleRespError, formatDate} from "./utils.js";

window.addEventListener('DOMContentLoaded', async () => {
    const token = checkLogin()

    const resp = await getSettings(token)
    handleRespError(resp)
    renderNotifies(resp.data)

    // 发送验证邮件
    document.querySelector('.send_btn').addEventListener('click', async (event) => {
        event.preventDefault()

        const email = document.querySelector('#email').value
        if (!email) {
            return
        }

        document.querySelector('.send_btn').classList.add('disabled')
        const resp = await sendVerifyEmail(email, token).finally(() => {
            document.querySelector('.send_btn').classList.remove('disabled')
        })
        handleRespError(resp)
        alert('邮件已发送成功，请查收')
    })
})

async function getSettings(token) {
    return fetch('/api/getSettings', {
        headers: {
            token: token,
        }
    }).then(resp => resp.json())
}

function renderNotifies(notifies) {
    const ul = document.querySelector('#notifies')
    for (const item of notifies) {
        const li = document.createElement('li')
        li.className = 'list-group-item d-flex justify-content-between align-items-center'
        li.textContent = `${item.type}: ${item.value}`
        const date = document.createElement('small')
        date.textContent = formatDate(new Date(item.created))
        li.append(date)
        ul.append(li)
    }
}

async function sendVerifyEmail(email, token) {
    return fetch('/api/notify/sendVerifyEmail', {
        headers: {
            token: token,
            email: email,
        }
    }).then(resp => resp.json())
}
