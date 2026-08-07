import { del, get, post, put } from "@/plugin/request/api.ts";

export const CalendarApi = {
    page(params?: CalendarPageParams): Promise<Page<CalendarVO>> {
        return get<Page<CalendarVO>>("/api/oa/calendar/page", params);
    },
    create(params: CalendarSaveParams): Promise<CalendarVO> {
        return post<CalendarVO>("/api/oa/calendar", params);
    },
    update(id: string, params: CalendarSaveParams): Promise<CalendarVO> {
        return put<CalendarVO>(`/api/oa/calendar/${id}`, params);
    },
    delete(id: string): Promise<void> {
        return del<void>(`/api/oa/calendar/${id}`);
    }
};
