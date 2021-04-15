import {
    formatNumberStringWithDigits,
    isPowOf10,
    isValidResolutionString,
    round,
    toFixed,
    toNumberString,
    toResolution,
} from '../../app/utils/numberStringHelpers';

describe(isPowOf10, () => {
    test('1, 10, 100, 1000 should all be powers of 10', () => {
        expect(isPowOf10(1n)).toBe(true);
        expect(isPowOf10(10n)).toBe(true);
        expect(isPowOf10(100n)).toBe(true);
        expect(isPowOf10(1000n)).toBe(true);
    });

    test('Non "power of 10" numbers should not be valid powers of 10', () => {
        expect(isPowOf10(5n)).toBe(false);
        expect(isPowOf10(11n)).toBe(false);
        expect(isPowOf10(30n)).toBe(false);
        expect(isPowOf10(-10n)).toBe(false);
    });
});

describe(isValidResolutionString, () => {
    test('Validates correct fraction values', () => {
        expect(isValidResolutionString(1n, true)('3')).toBe(true);
        expect(isValidResolutionString(1n, true)('-6')).toBe(true);
        expect(isValidResolutionString(10n, true)('0.1')).toBe(true);
        expect(isValidResolutionString(10n, true)('-0.3')).toBe(true);
        expect(isValidResolutionString(100n, true)('0.1')).toBe(true);
        expect(isValidResolutionString(100n, true)('0.20')).toBe(true);
        expect(isValidResolutionString(100n, true)('-0.22')).toBe(true);
    });

    test('Invalidates invalid fraction values', () => {
        expect(isValidResolutionString(1n, true)('0.3')).toBe(false);
        expect(isValidResolutionString(10n, true)('0.12')).toBe(false);
        expect(isValidResolutionString(100n, true)('-0.100')).toBe(false);
        expect(isValidResolutionString(100n, true)('0.200')).toBe(false);
        expect(isValidResolutionString(100n, true)('0.2233')).toBe(false);
    });

    test('Invalidates negative values when not allowed', () => {
        const invalidateNegative100 = isValidResolutionString(100n);

        expect(invalidateNegative100('0.10')).toBe(true);
        expect(invalidateNegative100('-0.10')).toBe(false);
    });
});

describe('Valid resolution common check', () => {
    test('Throws when given non "power of 10" resolution', () => {
        expect(() => toNumberString(5n)('1')).toThrow();
        expect(() => toResolution(-10n)('1')).toThrow();
        expect(() => toNumberString(123n)('1')).toThrow();
    });
});

describe(toNumberString, () => {
    test('Correctly formats numbers to fractions', () => {
        expect(toNumberString(100n)(10n)).toBe('0.1');
        expect(toNumberString(100n)('12')).toBe('0.12');
        expect(toNumberString(10n)(12n)).toBe('1.2');
        expect(toNumberString(10n)('-12')).toBe('-1.2');
        expect(toNumberString(10n)(-22n)).toBe('-2.2');
        expect(toNumberString(1n)('3')).toBe('3');
        expect(toNumberString(1n)(-22n)).toBe('-22');
        expect(toNumberString(1n)(undefined)).toBe(undefined);
    });

    test('Throws on invalid value for fraction conversion', () => {
        expect(() => toNumberString(100n)('text')).toThrow();
        expect(() => toNumberString(100n)('.3')).toThrow();
        expect(() => toNumberString(100n)('2.3')).toThrow();
    });
});

describe(toResolution, () => {
    test('Correctly formats fractions to resolution', () => {
        expect(toResolution(100n)('0.1')).toBe(10n);
        expect(toResolution(1n)('3')).toBe(3n);
        expect(toResolution(10n)('2.3')).toBe(23n);
        expect(toResolution(1n)(undefined)).toBe(undefined);
    });

    test('Throws on invalid value for resolution conversion', () => {
        expect(() => toResolution(100n)('text')).toThrow();
        expect(() => toResolution(100n)('.01')).toThrow();
        expect(() => toResolution(100n)('8.012')).toThrow();
    });
});

describe(round, () => {
    test('Rounds number strings to correct cipher', () => {
        expect(round(3)('1.2345')).toBe('1.235');
        expect(round(3)('-1.2345')).toBe('-1.235');
        expect(round(0)('1.235')).toBe('1');
        expect(round(0)('-1.235')).toBe('-1');
        expect(round(0)('1.535')).toBe('2');
        expect(round(0)('-1.535')).toBe('-2');
        expect(round(2)('1.53543')).toBe('1.54');
        expect(round(4)('9.99999')).toBe('10.0000');
        expect(round(2)('-1.53543')).toBe('-1.54');
        expect(round(4)('-9.99999')).toBe('-10.0000');
    });
});

describe(toFixed, () => {
    test('Adds missing zeros to number', () => {
        expect(toFixed(4)('1')).toBe('1.0000');
        expect(toFixed(4)('-1')).toBe('-1.0000');
        expect(toFixed(3)('19.09')).toBe('19.090');
    });

    test('Rounds when too many digits', () => {
        expect(toFixed(0)('1.1')).toBe('1');
        expect(toFixed(0)('-1.08')).toBe('-1');
        expect(toFixed(1)('1.98')).toBe('2.0');
        expect(toFixed(1)('-1.08')).toBe('-1.1');
        expect(toFixed(0)('1.8')).toBe('2');
        expect(toFixed(0)('-1.8')).toBe('-2');
    });
});

describe(formatNumberStringWithDigits, () => {
    test('Formats numbers according to min/max digits', () => {
        expect(formatNumberStringWithDigits(3)('0')).toBe('0.000');
        expect(formatNumberStringWithDigits(5)('3.9')).toBe('3.90000');
        expect(formatNumberStringWithDigits(1)('3.9123')).toBe('3.9123');
        expect(formatNumberStringWithDigits(3)('3.9123456789456123')).toBe(
            '3.9123456789456123'
        );
        expect(formatNumberStringWithDigits(3)('-10')).toBe('-10.000');

        expect(formatNumberStringWithDigits(3, 5)('3.9123456789456123')).toBe(
            '3.91235'
        );
        expect(formatNumberStringWithDigits(3, 5)('-0.9123456789456123')).toBe(
            '-0.91235'
        );
    });

    test('Throws when given incorrect values', () => {
        expect(() => formatNumberStringWithDigits(3, 2)('-10')).toThrow(); // min digits > max digits.
        expect(() => formatNumberStringWithDigits(3)('text')).toThrow();
    });
});
