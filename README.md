### Instructions for Use:

1. **Prerequisites**:
   - **Python 3**: Ensure that Python 3 is installed on your system.
   - **Python Libraries**: Install the required Python library using the following command:
     ```bash
     pip install requests
     ```
   - **Nmap**: Install Nmap, a network scanning utility. It is mandatory for checking open ports on subdomains.
   - **Nuclei**: Install Nuclei, a vulnerability scanning tool based on templates. Nuclei is mandatory for vulnerability scanning. It is also recommended to regularly update Nuclei templates:
     ```bash
     nuclei -ut
     ```
   - **SecurityTrails API**: Sign up on [SecurityTrails](https://securitytrails.com/) and obtain an API key.

2. **Environment Setup**:
   - **Telegram Bot**: Create a bot in Telegram and get the token through [BotFather](https://core.telegram.org/bots#6-botfather).
   - **Chat ID**: Find the ID of the group or chat where the bot will send scan results. You can use the `getUpdates` API to retrieve the group ID.
   - **Script Configuration**: Replace the values of `telegram_token`, `securitytrails_token`, and `chat_id` with your own in the script.

3. **Script Execution**:
   - Specify the list of domains to be scanned in the `domains` variable.
   - Run the script using the command:
     ```bash
     python3 your_script.py
     ```

4. **How the Script Works**:
   - The script gathers information about the subdomains of each domain, scans them for open ports and vulnerabilities using Nmap and Nuclei, and then sends the results to Telegram.
   - A message is sent to Telegram showing the number of vulnerabilities found and the open ports for each subdomain. A detailed report is attached as a file.

5. **Automating with cron**:
   - To run the script automatically, for example, every night at 2:00 AM, add it to the crontab:
     ```bash
     crontab -e
     ```
   - Add the following line to execute the script every day at 2:00 AM:
     ```
     0 2 * * * /usr/bin/python3 /path/to/your_script.py
     ```

6. **Notes**:
   - **Nmap** and **Nuclei** are mandatory tools for this script, so ensure they are installed and configured.
   - **Nuclei** should be used with updated templates for the most accurate and current scan results.



