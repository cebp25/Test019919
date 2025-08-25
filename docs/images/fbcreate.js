const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const { EmbedBuilder } = require('discord.js');
const { wrapper } = require('axios-cookiejar-support');
const tough = require('tough-cookie');

// Utility functions for generating random data
function randomString(length) {
    return Array.from({ length }, () => Math.floor(Math.random() * 10)).join('');
}

function randomPhone() {
    const prefixes = ['013', '014', '015', '016', '017', '018', '019'];
    return prefixes[Math.floor(Math.random() * prefixes.length)] + randomString(8);
}

function randomName() {
    const firstNames = ['Arif', 'Sadia', 'Jubiar', 'Marvin', 'Amina', 'Rahim', 'Sumon', 'Nadia', 'Tania', 'Adnan'];
    const lastNames = ['Hossain', 'Khan', 'Rahman', 'Islam', 'Ahmed', 'Akter', 'Chowdhury', 'Miah', 'Begum', 'Karim'];
    return {
        first: firstNames[Math.floor(Math.random() * firstNames.length)],
        last: lastNames[Math.floor(Math.random() * lastNames.length)]
    };
}

function randomPassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const randomChars = Array.from({ length: 8 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
    return `JUBIAR-${randomChars}`;
}

function randomUserAgent() {
    const uas = [
        'Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Mobile Safari/537.36',
        'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Mobile Safari/537.36',
        'Mozilla/5.0 (Linux; Android 10; SM-A505F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Mobile Safari/537.36',
        'Mozilla/5.0 (Linux; Android 9; Redmi Note 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
        'Mozilla/5.0 (Linux; Android 8.1; Nexus 6P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Mobile Safari/537.36',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
        'Mozilla/5.0 (Linux; Android 12; SM-S906N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Mobile Safari/537.36'
    ];
    return uas[Math.floor(Math.random() * uas.length)];
}

// Parse HTML inputs into form data
function extractForm(html) {
    const $ = cheerio.load(html);
    const formData = {};
    $('input').each((i, el) => {
        const name = $(el).attr('name');
        const value = $(el).attr('value') || '';
        if (name) formData[name] = value;
    });
    return formData;
}

// Save to file with proper error handling
function saveAccount(uid, passw, cookie, email, profile_url) {
    try {
        const dir = path.join(process.cwd(), 'RABBI');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const file = path.join(dir, 'SUCCESS-OK.txt');
        fs.appendFileSync(file, `${uid}|${passw}|${cookie}|${email}|${profile_url}\n`);
        return true;
    } catch (error) {
        console.error('Error saving account:', error);
        return false;
    }
}

function getProfileUrl(uid) {
    return `https://www.facebook.com/profile.php?id=${uid}`;
}

// Process multiple account creations with improved error handling and retry logic
async function processAccounts(message, emails) {
    const totalAccounts = emails.length;
    let live = 0;
    let cp = 0;
    
    const statusMessage = await message.reply(`⏳ Processing ${totalAccounts} account(s). This may take some time...`);
    
    for (let i = 0; i < totalAccounts; i++) {
        const email = emails[i];
        await message.channel.sendTyping();
        
        try {
            // Status update
            await statusMessage.edit(`⏳ Processing account ${i+1}/${totalAccounts} with email: ${email}\nSuccess: ${live} | Failed: ${cp}`);
            
            // Create account with retry logic
            let result = null;
            let retryCount = 0;
            const maxRetries = 2;
            
            while (retryCount <= maxRetries) {
                try {
                    result = await createAccount(email);
                    break; // Success, exit retry loop
                } catch (retryError) {
                    retryCount++;
                    if (retryCount <= maxRetries) {
                        await statusMessage.edit(`⚠️ Attempt ${retryCount}/${maxRetries} failed. Retrying in 5 seconds...`);
                        await new Promise(resolve => setTimeout(resolve, 5000));
                    } else {
                        throw retryError; // Max retries reached, propagate error
                    }
                }
            }
            
            if (result && result.success) {
                live++;
                const { uid, passw, cookie, profile_url } = result;
                
                // Truncate cookie for display (it can be very long)
                const displayCookie = cookie.length > 1000 
                    ? cookie.substring(0, 997) + '...' 
                    : cookie;
                
                const embed = new EmbedBuilder()
                    .setTitle('⚡ THE KILLER - ACCESS GRANTED ⚡')
                    .setColor(0x00FF00)
                    .addFields(
                        { name: '🔥 UID', value: uid, inline: true },
                        { name: '🔥 EMAIL', value: email, inline: true },
                        { name: '🔥 PASSWORD', value: passw, inline: true },
                        { name: '🔥 COOKIE', value: displayCookie, inline: false },
                        { name: '🔥 PROFILE', value: `[View profile](${profile_url})`, inline: false }
                    )
                    .setFooter({ text: '☠ SYSTEM BREACHED - AUTHORIZED ACCESS ☠' })
                    .setTimestamp();

                await message.channel.send({ embeds: [embed] });
            } else {
                cp++;
                await message.channel.send(`❌ Failed to create account ${i+1} with email ${email}: ${result?.error || 'Unknown error'}`);
            }
            
        } catch (error) {
            cp++;
            console.error(`Error creating account with email ${email}:`, error);
            await message.channel.send(`❌ Error creating account with email ${email}: ${error.message || 'Unknown error'}`);
        }
        
        // Add delay between account creations except for the last one
        if (i < totalAccounts - 1) {
            // Randomized delay to appear more natural and avoid detection
            const delay = Math.floor(Math.random() * 5000) + 5000; // 5-10 seconds
            await statusMessage.edit(`⏳ Waiting ${delay/1000} seconds before creating the next account...\nSuccess: ${live} | Failed: ${cp}`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    // Final status update
    await statusMessage.edit(`✅ Process completed! Created ${live} accounts successfully. Failed: ${cp}`);
}

// Create a single Facebook account with improved error handling
async function createAccount(email) {
    // Create a cookie jar
    const cookieJar = new tough.CookieJar();
    
    // Create axios instance with cookie jar support using the wrapper
    const session = wrapper(axios.create({
        jar: cookieJar,
        withCredentials: true,
        headers: {
            'User-Agent': randomUserAgent(),
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Connection': 'keep-alive'
        },
        timeout: 30000 // 30 second timeout
    }));

    // --- Step 1: Get registration form and extract tokens ---
    let form = {};
    let m_ts = '';
    try {
        const regRes = await session.get('https://touch.facebook.com/reg', {
            params: {
                _rdc: "1",
                _rdr: "",
                wtsid: `rdr_${randomString(12)}`,
                refsrc: "deprecated"
            }
        });
        form = extractForm(regRes.data);

        const mainRes = await session.get('https://touch.facebook.com');
        const match = mainRes.data.match(/name="m_ts" value="(.*?)"/);
        m_ts = match ? match[1] : '';
        
        if (!form.fb_dtsg || !m_ts) {
            throw new Error('Failed to extract required tokens from Facebook registration page');
        }
    } catch (err) {
        throw new Error(`Failed to get Facebook registration form: ${err.message}`);
    }

    // --- Step 2: Build payload with improved randomization ---
    const { first, last } = randomName();
    const phone = randomPhone();
    const passw = randomPassword();
    const birthday_day = Math.floor(Math.random() * 28) + 1;
    const birthday_month = Math.floor(Math.random() * 12) + 1;
    const birthday_year = Math.floor(Math.random() * (2004 - 1990 + 1)) + 1990;
    const sex = Math.random() > 0.5 ? "1" : "2"; // 1=male, 2=female

    const payload = {
        ccp: "2",
        reg_instance: form.reg_instance || "",
        submission_request: "true",
        helper: "",
        reg_impression_id: form.reg_impression_id || "",
        ns: "1",
        zero_header_af_client: "",
        app_id: "103",
        logger_id: form.logger_id || "",
        "field_names[0]": "firstname",
        firstname: first,
        lastname: last,
        "field_names[1]": "birthday_wrapper",
        birthday_day: String(birthday_day),
        birthday_month: String(birthday_month),
        birthday_year: String(birthday_year),
        age_step_input: "",
        did_use_age: "false",
        "field_names[2]": "reg_email__",
        reg_email__: email,
        reg_number__: phone,
        "field_names[3]": "sex",
        sex: sex,
        preferred_pronoun: "",
        custom_gender: "",
        "field_names[4]": "reg_passwd__",
        name_suggest_elig: "false",
        was_shown_name_suggestions: "false",
        did_use_suggested_name: "false",
        use_custom_gender: "false",
        guid: "",
        pre_form_step: "",
        encpass: `#PWD_BROWSER:0:${Math.floor(Date.now()/1000)}:${passw}`,
        submit: "Sign Up",
        fb_dtsg: form.fb_dtsg || "",
        jazoest: form.jazoest || "",
        lsd: form.lsd || "",
        m_ts: m_ts,
        __dyn: "1ZaaAG1mxu1oz-l0BBBzEnxG6U4a2i5U4e0C8dEc8uwcC4o2fwcW4o3Bw4Ewk9E4W0pKq0FE6S0x81vohw5Owk8aE36wqEd8dE2YwbK0iC1qw8W0k-0jG3qaw4kwbS1Lw9C0le0ue0QU",
        __csr: "",
        __req: "p",
        __fmt: "1",
        __a: "AYkiA9jnQluJEy73F8jWiQ3NTzmH7L6RFbnJ_SMT_duZcpo2yLDpuVXfU2doLhZ-H1lSX6ucxsegViw9lLO6uRx31-SpnBlUEDawD_8U7AY4kQ",
        __user: "0"
    };

    const headers = {
        'Host': 'm.facebook.com',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'User-Agent': randomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'dnt': '1',
        'X-Requested-With': 'mark.via.gp',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-User': '?1',
        'Sec-Fetch-Dest': 'document',
        'dpr': '1.75',
        'viewport-width': '980',
        'sec-ch-ua': '"Android WebView";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        'sec-ch-ua-mobile': '?1',
        'sec-ch-ua-platform': '"Android"',
        'sec-ch-ua-platform-version': '""',
        'sec-ch-ua-model': '""',
        'sec-ch-ua-full-version-list': '',
        'sec-ch-prefers-color-scheme': 'dark',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'Origin': 'https://www.facebook.com',
        'Referer': 'https://www.facebook.com/reg/'
    };

    // --- Step 3: Send registration request with error handling ---
    let response;
    try {
        response = await session.post(
            'https://www.facebook.com/reg/submit/?privacy_mutation_token=eyJ0eXBlIjowLCJjcmVhdGlvbl90aW1lIjoxNzM0NDE0OTk2LCJjYWxsc2l0ZV9pZCI6OTA3OTI0NDAyOTQ4MDU4fQ%3D%3D&multi_step_form=1&skip_suma=0&shouldForceMTouch=1',
            new URLSearchParams(payload),
            { headers, maxRedirects: 5 }
        );
    } catch (err) {
        throw new Error(`Failed to send registration request to Facebook: ${err.message}`);
    }

    // --- Step 4: Check cookies for c_user (success) ---
    let cookies = cookieJar.getCookiesSync('https://www.facebook.com');
    let c_user = null;
    let cookieStr = cookies.map(c => `${c.key}=${c.value}`).join(';');
    
    for (const c of cookies) {
        if (c.key === 'c_user') {
            c_user = c.value;
            break;
        }
    }

    if (c_user) {
        const uid = c_user;
        const profile_url = getProfileUrl(uid);

        // Save account with error handling
        const saveResult = saveAccount(uid, passw, cookieStr, email, profile_url);
        if (!saveResult) {
            console.warn(`Warning: Failed to save account to file, but account was created successfully.`);
        }

        return {
            success: true,
            uid,
            passw,
            cookie: cookieStr,
            email,
            profile_url
        };
    } else {
        // Check for specific error messages in the response
        let errorMessage = 'Account creation failed';
        if (response && response.data) {
            // Try to extract error message from response
            const $ = cheerio.load(response.data);
            const errorElement = $('#reg_error_inner');
            if (errorElement.length > 0) {
                errorMessage = errorElement.text().trim() || errorMessage;
            }
        }
        
        return {
            success: false,
            error: errorMessage
        };
    }
}

module.exports = {
    name: 'fbcreate',
    description: 'Register Facebook account(s) with the provided email(s)',
    async execute(message, args) {
        // Check permissions (optional security feature)
        if (!message.member.permissions.has('MANAGE_MESSAGES')) {
            return message.reply('❌ You do not have permission to use this command.');
        }
        
        if (args.length === 0) {
            return message.reply('❌ You must provide at least one email. Example: `fbcreate test@mail.com` or `fbcreate test1@mail.com test2@mail.com`');
        }
        
        // Extract valid emails from arguments with better validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const emails = args.filter(arg => emailRegex.test(arg));
        
        if (emails.length === 0) {
            return message.reply('❌ No valid email addresses provided. Example: `fbcreate test@mail.com`');
        }
        
        // Check if more than 5 accounts requested (to prevent abuse)
        if (emails.length > 5) {
            return message.reply('⚠️ For security reasons, you can only create up to 5 accounts at once.');
        }
        
        // Check for duplicate emails
        const uniqueEmails = [...new Set(emails)];
        if (uniqueEmails.length !== emails.length) {
            return message.reply('⚠️ Duplicate emails detected. Please provide unique email addresses.');
        }
        
        await message.reply(`🔄 Starting creation process for ${emails.length} Facebook account(s)...`);
        
        try {
            // Process account creation
            await processAccounts(message, emails);
        } catch (error) {
            console.error('Fatal error in account creation process:', error);
            await message.channel.send(`❌ A critical error occurred during the account creation process: ${error.message}`);
        }
    }
};