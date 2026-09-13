export {};

declare global {
    /** 当前生效的系统密码策略。 */
    interface SecurityPasswordPolicyVO {
        policy_key: string;
        min_length: number;
        max_length: number;
        require_uppercase: boolean;
        require_lowercase: boolean;
        require_digit: boolean;
        require_special: boolean;
        max_age_days: number | null;
        version: number;
    }
}
