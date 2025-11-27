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

