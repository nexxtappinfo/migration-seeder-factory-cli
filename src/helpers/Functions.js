const { faker } = require('@faker-js/faker');

/**
* Checks if a given string is a valid regex pattern.
* @param {string} pattern - The regex pattern as a string.
* @returns {boolean} - True if valid, false otherwise.
*/
const isValidRegex = (pattern) => {
    try {
        new RegExp(pattern);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Applies a regex replacement on the original value.
 * If the regex string is invalid, an error is logged and the original value is returned.
 * @param {string} regexStr - The regex pattern as a string.
 * @param {string} replaceWith - The string to replace matches with.
 * @param {string} originalValue - The original string value.
 * @returns {string} - The string after replacement, or the original value if the regex is invalid.
 */
const setRegexExpresion = (regexStr, replaceWith, originalValue) => {
    // Validate that regexStr is provided and is a string.
    if (!regexStr || typeof regexStr !== 'string') {
        logger.error('Error in setRegexExpresion: No valid regex pattern provided.');
        return originalValue;
    }

    // Check if the regex pattern is valid before attempting replacement.
    if (!isValidRegex(regexStr)) {
        logger.error(`Error in setRegexExpresion: Invalid regex pattern "${regexStr}" provided.`);
        return originalValue;
    }

    try {
        // Create a RegExp object using the global flag.
        const regex = new RegExp(regexStr, 'g');
        return originalValue.replace(regex, replaceWith);
    } catch (error) {
        logger.error(`Error in setRegexExpresion: ${error.message}`);
        // Return original value if any unexpected error occurs.
        return originalValue;
    }
}

/**
 * Applies a faker value according type.
 * @param {string} type - The value type.
 */
const getFakeValue = (type) => {
    switch (type.toLowerCase()) {
        case 'number': return faker.number.int(); // Any integer
        case 'smallint': return faker.number.int({ min: -32768, max: 32767 }); // Small integer range
        case 'mediumint': return faker.number.int({ min: -8388608, max: 8388607 }); // Medium integer range
        case 'bigint': return faker.number.bigInt({ min: -9223372036854775808n, max: 9223372036854775807n }); // Big integer
        case 'tinyint': return faker.number.int({ min: 1, max: 999 }); // Tiny integer
        case 'float': return faker.number.float({ min: -1000, max: 1000, precision: 0.01 }); // Floating-point number
        case 'double': return faker.number.float({ min: -1000000, max: 1000000, precision: 0.0001 }); // More precise float
        case 'decimal': return faker.number.float({ min: -9999999999, max: 9999999999, precision: 0.01 }).toFixed(2); // Decimal
        case 'boolean': return faker.datatype.boolean(); // Boolean value (true/false)
        case 'uuid': return faker.string.uuid(); // UUID
        case 'string': return faker.word.words(3); // Random string
        case 'char': return faker.string.alphanumeric(1); // Single character
        case 'varchar': return faker.word.words(5); // Short string
        case 'longtext': return faker.lorem.paragraph(); // Long text
        case 'alphanumeric': return faker.string.alphanumeric(10); // Alphanumeric
        case 'email': return faker.internet.email(); // Email address
        case 'url': return faker.internet.url(); // URL
        case 'username': return faker.internet.userName(); // Username
        case 'password': return faker.internet.password(); // Password
        case 'phone': return faker.phone.number(); // Phone number
        case 'address': return faker.location.streetAddress(); // Address
        case 'city': return faker.location.city(); // City
        case 'state': return faker.location.state(); // State
        case 'country': return faker.location.country(); // Country
        case 'zip': return faker.location.zipCode(); // ZIP code
        case 'ipv4': return faker.internet.ip(); // IPv4 address
        case 'ipv6': return faker.internet.ipv6(); // IPv6 address
        case 'company': return faker.company.name(); // Company name
        case 'color': return faker.color.human(); // Color name
        case 'hexcolor': return faker.color.rgb(); // Hex color code
        case 'date': return faker.date.past().toISOString().split('T')[0]; // Date (YYYY-MM-DD)
        case 'time': return faker.date.recent().toISOString().split('T')[1].split('.')[0]; // Time (HH:MM:SS)
        case 'datetime': return faker.date.recent().toISOString(); // Full date-time (ISO format)
        case 'future_date': return faker.date.future().toISOString().split('T')[0]; // Future date
        case 'past_date': return faker.date.past().toISOString().split('T')[0]; // Past date
        case 'credit_card': return faker.finance.creditCardNumber(); // Credit card number
        case 'currency': return faker.finance.currencyCode(); // Currency code (e.g., USD, EUR)
        case 'iban': return faker.finance.iban(); // IBAN (bank account)
        case 'bic': return faker.finance.bic(); // BIC/SWIFT code
        case 'job_title': return faker.person.jobTitle(); // Job title
        case 'company_suffix': return faker.company.name().split(' ').pop(); // Company suffix (e.g., Inc., LLC)
        case 'mac_address': return faker.internet.mac(); // MAC address
        default: return null;
    }
}


module.exports = {
    getFakeValue,
    setRegexExpresion
};