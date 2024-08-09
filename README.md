### 🛠️ **Instructions for Use**:

#### Prerequisites:

1. **🐍 Python 3**: Ensure that Python 3 is installed on your system.
2. **📦 Python Libraries**: Install the required Python library using the following command:
   ```bash
   pip install requests
   ```
3. **🖥️ Nmap**: Install Nmap, a network scanning utility. It is mandatory for checking open ports on subdomains.
4. **🔍 Nuclei**: Install Nuclei, a vulnerability scanning tool based on templates. Nuclei is mandatory for vulnerability scanning. It is also recommended to regularly update Nuclei templates:
   ```bash
   nuclei -ut
   ```
5. **🔑 SecurityTrails API**: Sign up on SecurityTrails and obtain an API key.

#### ⚙️ **Environment Setup**:

1. **🤖 Telegram Bot**: Create a bot in Telegram and get the token through [BotFather](https://core.telegram.org/bots#6-botfather).
2. **🆔 Chat ID**: Find the ID of the group or chat where the bot will send scan results. You can use the `getUpdates` API to retrieve the group ID.
3. **📝 Script Configuration**:
    - Open the script file in a text editor.
    - Replace the values in the following lines with your own tokens and chat ID:
      ```python
      # Your Tokens and Chat ID
      telegram_token = 'your_telegram_token'  # Replace with your Telegram bot token
      securitytrails_token = 'your_securitytrails_token'  # Replace with your SecurityTrails API key
      chat_id = 'your_chat_id'  # Replace with your Telegram group or chat ID
      ```
    - Replace the domains in the `domains` list with the ones you want to scan. You can find this on **line 14**:
      ```python
      domains = ['example1.com', 'example2.com', 'example3.com']
      ```

#### ▶️ **Script Execution**:

1. **🔍 Specify the Domains**: Ensure that the list of domains to be scanned is set correctly in the `domains` variable.
2. **🚀 Run the Script**:
   ```bash
   python3 Telegram_Automated_Vulnerability_Bot.py
   ```

#### 🛠️ **How the Script Works**:

- The script gathers information about the subdomains of each domain, scans them for open ports and vulnerabilities using Nmap and Nuclei, and then sends the results to Telegram.
- A message is sent to Telegram showing the number of vulnerabilities found and the open ports for each subdomain. A detailed report is attached as a file.

#### ⏰ **Automating with cron**:

To run the script automatically, for example, every night at 2:00 AM, add it to the crontab:
1. Open the crontab file:
   ```bash
   crontab -e
   ```
2. Add the following line to execute the script every day at 2:00 AM:
   ```bash
   0 2 * * * /usr/bin/python3 /path/to/Telegram_Automated_Vulnerability_Bot.py
   ```

#### 📝 **Notes**:

- Nmap and Nuclei are mandatory tools for this script, so ensure they are installed and configured.
- Nuclei should be used with updated templates for the most accurate and current scan results.

