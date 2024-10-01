# 📄 **README**

## 🛠️ **Instructions for Use**

### Prerequisites

1. **🐍 Python 3**: Ensure that Python 3 is installed on your system.
2. **📦 Python Libraries**: Install the required Python libraries using the following command:
   ```bash
   pip install requests urllib3
   ```
3. **🖥️ Nmap**: Install Nmap, a network scanning utility, which is mandatory for checking open ports on subdomains.
   ```bash
   # For Debian/Ubuntu
   sudo apt-get install nmap
   ```
4. **🔍 Nuclei**: Install Nuclei, a vulnerability scanning tool based on templates. It is mandatory for vulnerability scanning. Also, regularly update Nuclei templates:
   ```bash
   # Install Nuclei
   go install -v github.com/projectdiscovery/nuclei/v2/cmd/nuclei@latest

   # Add Nuclei to PATH
   export PATH=$PATH:$(go env GOPATH)/bin

   # Update Nuclei templates
   nuclei -update-templates
   ```
5. **🔎 Subfinder**: Install Subfinder, a subdomain discovery tool. It is mandatory for discovering subdomains.
   ```bash
   # Install Subfinder
   go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest

   # Add Subfinder to PATH
   export PATH=$PATH:$(go env GOPATH)/bin
   ```
6. **💻 Go Language**: Since Nuclei and Subfinder are written in Go, ensure that Go is installed on your system.
   ```bash
   # For Debian/Ubuntu
   sudo apt-get install golang
   ```
7. **🔐 Telegram API Access**: Create a Telegram bot and obtain the API token.

### ⚙️ **Environment Setup**

1. **🤖 Telegram Bot**: Create a bot in Telegram and get the token through [BotFather](https://core.telegram.org/bots#6-botfather).
2. **🆔 Chat ID**: Find the ID of the group or chat where the bot will send scan results. You can use the `getUpdates` API or bots like [IDBot](https://t.me/myidbot) to retrieve the group or chat ID.
3. **📝 Script Configuration**:
    - **Clone or Download the Script**: Save the script file as `script_scan_subdomain.py`.
    - **Edit the Script**:
      - Open the script file in a text editor.
      - Replace the values in the following lines with your own tokens and chat ID:
        ```python
        # Your Tokens and Chat ID
        telegram_token = 'your_telegram_bot_token'  # Replace with your Telegram bot token
        chat_id = 'your_chat_id'  # Replace with your Telegram group or chat ID
        ```
      - Replace the domains in the `domains` list with the ones you want to scan:
        ```python
        domains = ['example1.com', 'example2.com', 'example3.com']  # Replace with your target domains
        ```

### ▶️ **Script Execution**

1. **🔍 Verify Domains**: Ensure that the list of domains to be scanned is correctly set in the `domains` variable.
2. **🚀 Run the Script**:
   ```bash
   python3 script_scan_subdomain.py
   ```
   - The script will perform the following actions:
     - Discover subdomains using Subfinder.
     - Check the availability of each subdomain.
     - Scan open ports using Nmap.
     - Scan for vulnerabilities using Nuclei.
     - Generate an HTML report with the findings.
     - Send a summary message and the detailed HTML report to your specified Telegram chat.

### 🛠️ **How the Script Works**

- **Subdomain Discovery**: Uses Subfinder to find subdomains for each specified domain.
- **Availability Check**: Verifies if the subdomains are accessible over HTTP or HTTPS.
- **Port Scanning**: Utilizes Nmap to scan common ports on accessible subdomains.
- **Vulnerability Scanning**: Uses Nuclei with medium, high, and critical severity templates to scan for vulnerabilities on accessible subdomains.
- **Report Generation**:
  - **Summary**: A brief summary is sent to Telegram, listing each subdomain with the number of vulnerabilities found and the open ports.
  - **Detailed Report**: An HTML file containing detailed information about each subdomain is generated and sent to Telegram.

### ⏰ **Automating with cron**

To run the script automatically at a specified interval (e.g., every day at 2:00 AM), you can use cron:

1. **Edit crontab**:
   ```bash
   crontab -e
   ```
2. **Add Cron Job**:
   ```bash
   0 2 * * * /usr/bin/python3 /path/to/script_scan_subdomain.py
   ```
   - Replace `/path/to/script_scan_subdomain.py` with the actual path to your script.
   - This will schedule the script to run daily at 2:00 AM.

### 📝 **Notes**

- **Ensure Tools are in PATH**: Make sure that `nuclei` and `subfinder` are accessible from the command line. If not, add their installation directories to your `PATH` environment variable.
  ```bash
  export PATH=$PATH:$(go env GOPATH)/bin
  ```
- **Update Nuclei Templates Regularly**: For the most accurate and up-to-date vulnerability scanning results, regularly update Nuclei templates:
  ```bash
  nuclei -update-templates
  ```
- **Permissions**: Ensure the script has execution permissions:
  ```bash
  chmod +x script_scan_subdomain.py
  ```
- **Dependencies**: All required tools (Nmap, Nuclei, Subfinder) must be installed and properly configured for the script to function correctly.
- **Legal Considerations**:
  - **Authorization**: Before scanning any domains, ensure you have explicit permission to do so. Unauthorized scanning may violate laws or regulations.
  - **Responsible Use**: Use this script responsibly and ethically, adhering to all applicable laws and organizational policies.

### 📞 **Support**

If you encounter any issues or have questions about the script, feel free to reach out for assistance.

### 📚 **References**

- **Nmap**: [https://nmap.org/](https://nmap.org/)
- **Nuclei**: [https://nuclei.projectdiscovery.io/](https://nuclei.projectdiscovery.io/)
- **Subfinder**: [https://github.com/projectdiscovery/subfinder](https://github.com/projectdiscovery/subfinder)
- **Telegram Bots Guide**: [https://core.telegram.org/bots](https://core.telegram.org/bots)

---

**Disclaimer**: This script is intended for authorized security testing and educational purposes only. Unauthorized use of this script against systems you do not own or have explicit permission to test is illegal and unethical.
