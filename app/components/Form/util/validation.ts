import { Validate } from 'react-hook-form';
import { isValidBigInt } from '~/utils/numberStringHelpers';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const allowOptional = (validator: Validate): Validate => (v: any) =>
    !v || validator(v);

export const minDate = (min: Date, message?: string): Validate => (v: Date) => {
    return v > min ? true : message || false;
};

export const maxDate = (max: Date, message?: string): Validate => (v: Date) => {
    return v < max ? true : message || false;
};

export const pastDate = (message?: string): Validate =>
    maxDate(new Date(), message);

export const futureDate = (message?: string): Validate =>
    minDate(new Date(), message);

export const validBigInt = (message?: string): Validate => (value: string) => {
    return isValidBigInt(value) || message || false;
};
