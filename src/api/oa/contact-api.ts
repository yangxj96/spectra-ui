import { get } from "@/plugin/request/api.ts";

export const ContactApi = {
    page(params?: ContactPageParams): Promise<Page<ContactVO>> {
        return get<Page<ContactVO>>("/api/oa/contact/page", params);
    }
};
