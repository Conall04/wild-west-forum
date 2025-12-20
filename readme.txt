Wild West Forum

    This is a server-side web application built for COS 498: Server-Side Web Development at the University of Maine Fall of 2025.
    The Wild West Forum is an American wild west website forum thatallows users to register, log in, post comments, chat live with other users, 
    and manage their profiles. The application demonstrates authentication, session management, database persistence, pagination, and real-time communication.

A) Features Implemented

A.1 User Accounts
    - User registration with validation
    - Secure login using hashed passwords (Argon2)
    - Session-based authentication
    - Logout functionality
    - Password reset via email (SendGrid)

 A.2 Profile Management
    - Update display name
    - Update email (requires password verification)
    - Change password
    - Customize profile color
    - Profile color is used in live chat

 A.3 Comments System
    - Comments stored in SQLite
    - Paginated comment feed
    - Create new comments (authenticated users only)
    - “Read More” functionality for long comments
    - Individual comment detail pages

 A.4 Live Chat
    - Real-time live chat using Socket.IO
    - Displays user display name and profile color
    - Authenticated users only

 A.5 PDFs
    - Secure server-side PDF access
    - Validation before serving files

 

B) Tech Stack
    - Node.js
    - Express
    - Handlebars
    - SQLite (better-sqlite3)
    - Socket.IO
    - Docker & Docker Compose
    - Nginx Proxy Manager
    - SendGrid (email)

 

C) How to Run the Project

C.1 Prerequisites:
    - Docker
    - Docker Compose

C.2 Steps:

 1. Clone the repository:
   ```bash
    git clone https://github.com/Conall04/wild-west-forum.git
    cd wild-west-forum

2. Create a .env file (see the Environment Variables section for more information)

3. Build and start the containers:
    docker compose build
    docker compose up


4. Visit the site in your browser:
    http://localhost


D) Environment Variables

This project uses environment variables for secrets and configuration.

Create a .env file (DO NOT COMMIT THIS FILE):

    SENDGRID_API_KEY=your_sendgrid_api_key_here
    SENDGRID_FROM_EMAIL=your_verified_sendgrid_email
    PUBLIC_BASE_URL=https://your-domain.com

E) Security Notes
    - Passwords are hashed using Argon2
    - Password reset tokens are time-limited
    - Sessions are invalidated on password change
    - Sensitive files are excluded via .gitignore



















Wild West Forum (Extended for assignment 3):
    This repo was originaly for a midterm project for COS 498 at the University of Maine. This project 
and repo was later (11/27/2025) extended to include requirments for Assignment 3 for the same class.
This extencion included:
    - A secure PDF reading system
    - Module routing
    - Module PDF handeling
PDF document are stored privately, on the server and should not be accesable through static serving.
That is to say that all access to files is fist validated through a custome module that checks filenames,
metadata, and file existance, before serving the content, which in this case are PDF files.
The website project concists of the following pages:
    - Home (-> This is the first page you will see when you type the address of the site)
    - Comments (-> This is where you can see comment that users have left)
    - Readings # Added for Assignment 3 (-> Here is where you can access the PDF files within the site/project)
    - Register (-> Here is where people can registe to be Registered users, which can leave comments)
    - Login (-> Here is where one can log in with their login credentials [username, password])


How to run:
    1) clone repo
    2) type -> docker compose build
    3) type -> docker compose up

NOTE: This repo does not contain the actual PDF files. If you download, adn use this repo yourself, 
you will have to add your own PDF files. Additionally, you will have to change the pdf_metadata.json file,
so that it reflects the PDF files you use/add.
