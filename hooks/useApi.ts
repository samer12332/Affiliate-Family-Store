"use client";

import { useCallback } from "react";

// Using Next.js API routes at /api
const API_URL = "/api";

export const useApi = () => {
  const request = useCallback(async (
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> => {
    const url = `${API_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
      ...options,
    });

    const rawBody = await response.text();
    const contentType = response.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    let data: any = {};
    if (rawBody.length > 0) {
      if (isJson) {
        try {
          data = JSON.parse(rawBody);
        } catch {
          data = { error: "Invalid JSON response from server" };
        }
      } else {
        data = { error: rawBody };
      }
    }

    if (!response.ok) {
      const message =
        (typeof data?.error === "string" && data.error.trim().length > 0
          ? data.error
          : `Request failed (${response.status})`);
      throw new Error(message);
    }

    return data;
  }, []);

  const get = useCallback((endpoint: string) => {
    return request(endpoint, { method: "GET" });
  }, [request]);

  const post = useCallback((endpoint: string, body: any) => {
    return request(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }, [request]);

  const put = useCallback((endpoint: string, body: any) => {
    return request(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }, [request]);

  const delete_ = useCallback((endpoint: string) => {
    return request(endpoint, { method: "DELETE" });
  }, [request]);

  return {
    request,
    get,
    post,
    put,
    delete: delete_,
  };
};
