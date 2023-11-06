import {checkLogin, handleRespError, formatDate} from "./utils.js";

window.addEventListener('DOMContentLoaded', async () => {
    const token = checkLogin()

    const resp = await getSettings(token)
    handleRespError(resp)
    renderNotifies(resp.data)

    // 发送验证邮件
    document.querySelector('form').addEventListener('submit', async (event) => {
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
        document.querySelector('#email').value = ''
    })
    document.querySelector('#notifies').addEventListener('click', async (event) => {
        event.preventDefault()

        if (event.target.tagName !== 'BUTTON') {
            return
        }

        const target = event.target.closest('li')
        if (target) {
            const resp = await deleteNotifyMethod(target.dataset.id, token)
            handleRespError(resp)
            renderNotifies(resp.data)
        }
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
        li.dataset.id = item.id
        const wrapper = document.createElement('div')
        const div1 = document.createElement('div')
        div1.textContent = `${item.type}: ${item.value}`
        const div2 = document.createElement('small')
        div2.textContent = formatDate(new Date(item.created))
        wrapper.append(div1)
        wrapper.append(div2)
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = 'btn-close'
        btn.ariaLabel = 'Close'
        li.append(wrapper)
        li.append(btn)
        ul.append(li)
    }
    if (notifies.length === 0) {
        ul.innerHTML = '暂无配置'
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

async function deleteNotifyMethod(id, token) {
    return fetch('/api/notify/deleteNotifyMethod', {
        headers: {
            token: token,
            id: id,
        }
    }).then(resp => resp.json())
}
