import type { Credential } from "./credential.ts";
import { getNotifies } from "./setting.ts";
import { getTaskPauseHtml, sendEmail } from "../utils/email.ts";
import runtime from "../runtime.ts";
import {timestamp} from "../utils/index.ts";

const kv = runtime.kv;

// 自动阅读的书籍信息
export interface BookInfo {
  bookId: string;
  title: string;
  author: string;
}

// 自动阅读任务
export interface ReadingTask {
  credential: Credential;
  book: BookInfo;
  params: Record<string, string | number>;
  seconds: number;
  createdAt: number;
  updatedAt: number;
  isActive: boolean;
}

export async function setReaderToken(readerToken: string) {
  await kv.set(["reader.token"], readerToken);
}

export async function getReaderToken(): Promise<string | null> {
  return (await kv.get<string>(["reader.token"])).value;
}

/**
 * 添加阅读任务
 * @param credential
 * @param bookInfo
 * @param pc
 * @param ps
 * @param createdAt
 */
export async function addReadingTask(
  credential: Credential,
  bookInfo: BookInfo,
  pc: number,
  ps: number,
  createdAt = Date.now(),
) {
  // 添加新的任务
  const task: ReadingTask = {
    credential: credential,
    book: bookInfo,
    params: {
      pc,
      ps,
    },
    seconds: 0,
    createdAt: createdAt,
    updatedAt: Date.now(),
    isActive: true,
  };
  await kv.set(["task", "read", credential.vid], task);
}

/**
 * 更新阅读任务
 * @param credential
 * @param seconds
 */
export async function updateReadingTask(credential: Credential, seconds = 0) {
  const entry = await kv.get<ReadingTask>(["task", "read", credential.vid]);
  if (!entry.value) {
    // 任务不存在
    console.warn(
      `任务不存在: (vid: ${credential.vid}, name: ${credential.name})`,
      entry,
    );
    return;
  }

  const task = entry.value as ReadingTask;

  // 执行时间(中国时间)
  const date = new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "Asia/Shanghai",
  }).format(Date.now()).split(" ")[0];
  const lastUpdateDate = new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "Asia/Shanghai",
  }).format(task.updatedAt).split(" ")[0];

  if (date > lastUpdateDate) {
    // 当天第一次执行
    task.seconds = seconds;
  } else if (date === lastUpdateDate) {
    task.seconds += seconds;
  } else {
    console.warn(`task更新时间:${date}, 上次更新时间:${lastUpdateDate}`);
    console.warn(credential, seconds);
  }
  task.updatedAt = Date.now();
  await kv.set(["task", "read", credential.vid], task);
}

/**
 * 暂停阅读任务
 * @param task
 */
export async function pauseReadTask(task: ReadingTask) {
  task.isActive = false;
  await kv.set(["task", "read", task.credential.vid], task);

  // 发送提醒通知
  const notifies = await getNotifies(task.credential);
  for (const notifyMethod of notifies) {
    if (notifyMethod.type === "email") {
      // 发送邮件通知
      const result = await sendEmail(
        notifyMethod.value,
        "任务暂停通知",
        getTaskPauseHtml(runtime.deployDomain),
      );
      console.log(`发送任务暂停提醒邮件${notifyMethod.value}`);
      if (!result) {
        console.warn("通知邮件发送失败");
      }
    }
  }
}

/**
 * 更新阅读任务中的token
 * 当用户换设备登录，或者清除缓存重新登录时，token会发生变化，所以在登录成功时需要同步替换任务中的token
 * @param credential
 */
export async function updateTaskToken(credential: Credential) {
  const taskEntry = await kv.get<ReadingTask>(["task", "read", credential.vid]);
  if (taskEntry.value) {
    const task = taskEntry.value as ReadingTask;
    task.credential = credential;
    task.isActive = true;
    await kv.set(taskEntry.key, task);
  }
}

/**
 * 检索用户的任务
 * @param credential
 */
export async function getReadingTask(
  credential: Credential,
): Promise<ReadingTask | null> {
  const entry = await kv.get(["task", "read", credential.vid]);
  if (entry.value) {
    return entry.value as ReadingTask;
  } else {
    return null;
  }
}

/**
 * 查询所有用户的阅读任务
 */
export async function getAllReadingTask(): Promise<ReadingTask[]> {
  const tasks: ReadingTask[] = [];
  for await (const task of kv.list<ReadingTask>({ prefix: ["task", "read"] })) {
    tasks.push(task.value);
  }
  return tasks;
}

/**
 * 删除阅读任务
 * @param credential
 */
export async function removeReadingTask(credential: Credential) {
  await kv.delete(["task", "read", credential.vid]);
}

export async function runningReadTask() {
  const entry = await kv.get(["state", "cron::runReadTask"]);
  return entry.value === "running";
}
export async function setReadTaskState() {
  await kv.set(["state", "cron::runReadTask"], {
    state: "running",
    timestamp: timestamp(),
  });
}
export async function clearReadTaskState() {
  await kv.delete(["state", "cron::runReadTask"]);
}
