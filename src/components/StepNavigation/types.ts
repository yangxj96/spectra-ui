export interface StepNavigationChild {
    key: string;
    title: string;
    description?: string;
    complete?: boolean;
    disabled?: boolean;
}

export interface StepNavigationItem extends StepNavigationChild {
    children?: readonly StepNavigationChild[];
}
