import { UserAgentForWeb } from "../config.ts";

function stringifyQuery(
  query: Record<string, string | number | boolean> = {},
): Record<string, string> {
  const data: Record<string, string> = {};
  Object.keys(query).reduce((obj, key) => {
    obj[key] = query[key].toString();
    return obj;
  }, data);
  return data;
}

export function get(
  url: string,
  query: Record<string, string | number> = {},
  header: Record<string, string> = {},
) {
  if (Object.keys(query).length) {
    url += "?" + new URLSearchParams(stringifyQuery(query)).toString();
  }
  const headers: Record<string, string> = {
    "User-Agent": UserAgentForWeb,
    ...header,
  };
  return fetch(url, {
    method: "GET",
    cache: "default",
    headers,
  });
}

function post(
  url: string,
  data: Record<string, any> = {},
  format = "json",
  header: Record<string, string> = {},
) {
  let body;
  const headers: Record<string, string> | undefined = {
    "User-Agent": UserAgentForWeb,
    ...header,
  };

  if (format === "query" && Object.keys(data).length) {
    url += "?" + new URLSearchParams(stringifyQuery(data)).toString();
    body = undefined;
  } else if (format === "json") {
    body = JSON.stringify(data);
    headers["Content-Type"] = "application/json";
  } else if (format === "form-data") {
    const formData = new FormData();
    Object.keys(data).forEach((key) => {
      formData.append(key, data[key]);
    });
    body = formData;
  }
  return fetch(url, {
    method: "POST",
    cache: "no-store",
    body,
    headers,
  });
}

export function postJSON(
  url: string,
  data: Record<string, any> = {},
  headers: Record<string, string> = {},
) {
  return post(url, data, "json", headers);
}

export function postQuery(
  url: string,
  data: Record<string, string | number | boolean> = {},
  headers: Record<string, string> = {},
) {
  return post(url, data, "query", headers);
}

export function postFormData(
  url: string,
  data: Record<string, string | number | boolean> = {},
  headers: Record<string, string> = {},
) {
  return post(url, data, "form-data", headers);
}
