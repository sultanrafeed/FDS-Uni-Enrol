window.REPO = {
 "repo": "sultanrafeed/FDS-Uni-Enrol",
 "branch": "main",
 "commit": "ab0aeaa",
 "note": "with 3 fixes: login_window.py, student_controller.py, enrolment_controller.py",
 "snapshotDate": "2026-10-07",
 "files": {
  "README.md": {
   "text": "# FDS-UniEnroll\nUniversity enrolment system for UTS 32555 Fundamentals of Software Development, Assessment 1 Part 2.\nCmp1-07 Group 3.\n\n\n#Willy \n- added the student login and register feature for the CLI\n- a successful login opens the enrolment menu for that student.\n- `StudentController` now takes the database, so `main.py` passes it in.\n- change the password pattern based on the requirements, it is now\n  `^[A-Z][a-zA-Z]{4,}[0-9]{3,}$`\n- added `save_student()` in `student_system/enrolment_controller.py`\n- `calculate_average_mark_and_grade()` returns the mark and the grade as a pair\n  instead of writing `average_mark` and `average_grade`\n\n\n## Running\n\nRun both from the project root.\n\n```bash\npython3 main.py        # CLIUniApp\npython3 gui_main.py    # GUIUniApp\n\n\n```\n\n\n",
   "authors": {
    "Willy Sandi": 1,
    "Rafeed Sultan": 1,
    "minhshing": 1
   }
  },
  "admin_system/__init__.py": {
   "text": "",
   "authors": {
    "Minh Nguyen": 1
   }
  },
  "admin_system/admin_controller.py": {
   "text": "from database.database import Database\n\nfrom models.subject import calculate_grade\nfrom utils.constants import MarkThresholdConstants, PassThresholdConstants\nfrom utils.exception.admin_controller import (ClearDatabaseError,\n                                              GroupStudentsError,\n                                              PartitionStudentsError,\n                                              RemoveStudentError, ShowStudentsError)\n\ndef generate_output_string_from_students(students):\n    output_string = \"\"\n\n    for student in students:\n        average_mark, average_grade = calculate_average_mark_and_grade(student)\n\n        name = student[\"name\"]\n        id = student[\"id\"]\n\n        output_string += f\"{name} :: {id} --> GRADE: {average_grade} - MARK: {average_mark}, \"\n\n    # remove the \", \" at the end\n    output_string = output_string[:-2]\n    return output_string\n\n# return the student's average mark and the grade that goes with it.\n# this does not touch the student dict, because get_all_students hands out\n# the live records and anything written here would end up in students.data.\ndef calculate_average_mark_and_grade(student):\n    subjects = student[\"subjects\"]\n\n    total_mark = 0\n    for subject in subjects:\n        mark = subject[\"mark\"]\n        total_mark += mark\n\n    # a student with no subjects has no marks to average\n    if len(subjects) == 0:\n        average_mark = 0.0\n    else:\n        average_mark = total_mark / len(subjects)\n\n    return average_mark, calculate_grade(average_mark)\n\nclass AdminController:\n    def __init__(self, database: Database):\n        self.database = database\n\n    def clear_database(self):\n        try:\n            self.database.delete_all_students()\n            print(\"successfully cleared database\")\n        except Exception as e:\n            print(\"error clearing database: \" + str(e))\n            raise ClearDatabaseError\n\n    def group_students(self):\n        try:\n            print(\"GRADE GROUPING\")\n\n            students = self.database.get_all_students()\n\n            if len(students) == 0:\n                print(\"<Nothing to display>\")\n            else:\n                z_students = []\n                p_students = []\n                c_students = []\n                d_students = []\n                hd_students = []\n\n                for student in students:\n                    average_mark, _ = calculate_average_mark_and_grade(student)\n\n                    if average_mark < MarkThresholdConstants.Z_NUMBER:\n                        z_students.append(student)\n                    elif average_mark < MarkThresholdConstants.P_NUMBER:\n                        p_students.append(student)\n                    elif average_mark < MarkThresholdConstants.C_NUMBER:\n                        c_students.append(student)\n                    elif average_mark < MarkThresholdConstants.D_NUMBER:\n                        d_students.append(student)\n                    else:\n                        hd_students.append(student)\n\n                if len(z_students) > 0:\n                    output_string = generate_output_string_from_students(z_students)\n                    print(f\"{MarkThresholdConstants.Z_STRING} -- > [{output_string}]\")\n\n                if len(p_students) > 0:\n                    output_string = generate_output_string_from_students(p_students)\n                    print(f\"{MarkThresholdConstants.P_STRING} --> [{output_string}]\")\n\n                if len(c_students) > 0:\n                    output_string = generate_output_string_from_students(c_students)\n                    print(f\"{MarkThresholdConstants.C_STRING} --> [{output_string}]\")\n\n                if len(d_students) > 0:\n                    output_string = generate_output_string_from_students(d_students)\n                    print(f\"{MarkThresholdConstants.D_STRING} --> [{output_string}]\")\n\n                if len(hd_students) > 0:\n                    output_string = generate_output_string_from_students(hd_students)\n                    print(f\"{MarkThresholdConstants.HD_STRING} --> [{output_string}]\")\n\n\n        except Exception as e:\n            print(\"error grouping students: \" + str(e))\n            raise GroupStudentsError\n\n    def partition_student(self):\n        try:\n            print(\"PASS/FAIL PARTITIONING\")\n\n            students = self.database.get_all_students()\n\n            pass_students = []\n            fail_students = []\n\n            for student in students:\n                average_mark, _ = calculate_average_mark_and_grade(student)\n                if average_mark < PassThresholdConstants.PASS:\n                    fail_students.append(student)\n                else:\n                    pass_students.append(student)\n\n            fail_output_string = \"\"\n            if len(fail_students) > 0:\n                fail_output_string = generate_output_string_from_students(fail_students)\n            print(f\"FAIL --> [{fail_output_string}]\")\n\n            pass_output_string = \"\"\n            if len(pass_students) > 0:\n                pass_output_string = generate_output_string_from_students(pass_students)\n            print(f\"PASS --> [{pass_output_string}]\")\n\n        except Exception as e:\n            print(\"error partitioning students: \" + str(e))\n            raise PartitionStudentsError\n\n    def remove_student(self, student_id):\n        try:\n            student = self.database.get_student_by_id(student_id)\n\n            if student is None:\n                print(\"Student does not exist\")\n            else:\n                self.database.delete_student(student_id)\n        except Exception as e:\n            print(\"error removing student: \" + str(e))\n            raise RemoveStudentError\n\n    def show_students(self):\n        try:\n            students = self.database.get_all_students()\n            if len(students) == 0:\n                print(\"<Nothing to display>\")\n            else:\n                output_string = generate_output_string_from_students(students)\n                print(f\"[{output_string}]\")\n        except Exception as e:\n            print(\"error show: \" + str(e))\n            raise ShowStudentsError\n",
   "authors": {
    "Willy Sandi": 1,
    "Minh Nguyen": 2
   }
  },
  "admin_system/admin_menu.py": {
   "text": "from admin_system.admin_controller import AdminController\n\nfrom utils.constants import AdminMenuInputConstants\n\nclass AdminMenu:\n    def __init__(self, controller: AdminController):\n        self.controller = controller\n\n    def run(self):\n        while True:\n            user_input = input(\"Admin System (c/g/p/r/s/x): \")\n            if user_input == AdminMenuInputConstants.INPUT_CLEAR_DATABASE:\n                self.controller.clear_database()\n            elif user_input == AdminMenuInputConstants.INPUT_GROUP_STUDENTS:\n                self.controller.group_students()\n            elif user_input == AdminMenuInputConstants.INPUT_PARTITION_STUDENTS:\n                self.controller.partition_student()\n            elif user_input == AdminMenuInputConstants.INPUT_REMOVE_STUDENT:\n                student_id = input(\"REMOVE BY ID: \")\n                self.controller.remove_student(student_id)\n            elif user_input == AdminMenuInputConstants.INPUT_SHOW:\n                self.controller.show_students()\n            elif user_input == AdminMenuInputConstants.INPUT_EXIT:\n                break\n            else:\n                print(\"invalid input\")\n",
   "authors": {
    "Minh Nguyen": 3
   }
  },
  "database/__init__.py": {
   "text": "",
   "authors": {
    "Minh Nguyen": 1
   }
  },
  "database/database.py": {
   "text": "import json\nfrom pathlib import Path\n\nfrom utils.exception.database import (CreateDatabaseFileError,\n                             LoadStudentDataError,\n                             CreateStudentError,\n                             UpdateStudentError,\n                             GetStudentByIdError,\n                             GetStudentByEmailError,\n                             DeleteStudentError,\n                             DeleteAllStudentsError,\n                             SaveStudentsError)\n\n\nclass Database:\n    #Minh's Prev code\n    # students = []\n\n    def __init__(self, filename):\n        self.students = [] #Rafeed's new code\n        self.file = Path(filename)\n\n        if not self.file.exists():\n            try:\n                self.file.write_text(\"[]\", encoding=\"utf-8\")\n            except Exception as e:\n                print(\"error creating database file: \" + str(e))\n                raise CreateDatabaseFileError\n\n        # load students\n        try:\n            \n            with self.file.open(\"r\", encoding=\"utf-8\") as student_data:\n                records = json.load(student_data)\n\n                for record in records:\n                    self.students.append(record)\n        except Exception as e:\n            print(\"error loading database file: \" + str(e))\n            raise LoadStudentDataError\n\n    def save_students(self):\n        try:\n            #Minh's Prev code : the file becomes one unreadable line\n            # self.file.write_text(json.dumps(self.students), encoding=\"utf-8\")\n            #Rafeed's new code\n            self.file.write_text(json.dumps(self.students, indent=2), encoding=\"utf-8\")\n        except Exception as e:\n            print(\"error saving students: \" + str(e))\n            raise SaveStudentsError\n\n    def create_student(self, student):\n        try:\n            self.students.append(student)\n            self.save_students()\n        except Exception as e:\n            print(\"error creating student: \" + str(e))\n            raise CreateStudentError\n\n    def get_all_students(self):\n        return self.students\n\n    def get_student_by_id(self, id):\n        try:\n            for student in self.students:\n                if student[\"id\"] == id:\n                    return student\n\n            return None\n        except Exception as e:\n            print(\"error getting student by id: \" + str(e))\n            raise GetStudentByIdError\n\n    def get_student_by_email(self, email):\n        try:\n            for student in self.students:\n                if student[\"email\"] == email:\n                    return student\n\n            return None\n        except Exception as e:\n            print(\"error getting student by email: \" + str(e))\n            raise GetStudentByEmailError\n    #Minh's old code\n    # def update_student(self, id, student):\n    #     try:\n    #         for index, student in enumerate(self.students):\n    #             if student[\"id\"] == id:\n    #                 self.students[index] = student\n    #                 break\n\n    #         self.save_students()\n    #     except Exception as e:\n    #         print(\"error updating student: \" + str(e))\n    #         raise UpdateStudentError\n    #Rafeeds new code:\n    def update_student(self, id, updated_student):\n\n        try:\n            for index, existing_student in enumerate(self.students):\n                if existing_student[\"id\"] == id:\n                    self.students[index] = updated_student\n                    break\n\n            self.save_students()\n        except Exception as e:\n            print(\"error updating student: \" + str(e))\n            raise UpdateStudentError\n\n    def delete_student(self, id):\n        try:\n            for index, student in enumerate(self.students):\n                if student[\"id\"] == id:\n                    self.students.pop(index)\n                    break\n\n            self.save_students()\n        except Exception as e:\n            print(\"error deleting student: \" + str(e))\n            raise DeleteStudentError\n\n    def delete_all_students(self):\n        try:\n            self.students = []\n            self.save_students()\n        except Exception as e:\n            print(\"error deleting all students: \" + str(e))\n            raise DeleteAllStudentsError\n",
   "authors": {
    "Rafeed Sultan": 1,
    "Minh Nguyen": 3
   }
  },
  "gui_main.py": {
   "text": "#entry poiint for GUIUniApp\n#run this file to start the gui app\n# python3 gui_main.py\n#guiuniapp uses the same students.data file as cli app\n#so any stud registered through the cli can login here.\nfrom database.database import Database\nfrom student_system.enrolment_controller import EnrolmentController\n\nfrom student_system.student_controller import StudentController\n\nfrom gui_system.login_window import LoginWindow\n\ndef main():\n    # the same file the CLI uses, so both applications share the data.\n    database = Database(filename=\"students.data\")\n\n    student_controller = StudentController(database)\n    enrolment_controller = EnrolmentController(None, database=database)\n\n    login_window = LoginWindow(student_controller, enrolment_controller)\n    login_window.mainloop()\n\nif __name__ == \"__main__\":\n    main()\n",
   "authors": {
    "Minh Nguyen": 2,
    "Rafeed Sultan": 2
   }
  },
  "gui_system/__init__.py": {
   "text": "",
   "authors": {
    "Rafeed Sultan": 1
   }
  },
  "gui_system/enrolment_window.py": {
   "text": "#enrolment window for guiuniapp\n# a logged in stud can enrol in upto four subs here\n#and open the subs window to see what they are enrolled in\n\n#this window uses the same EnrolmentController as the CLI application.\n# so the four subs limit and the saving to students.data behave.\n#exactly the same way in both.\n\nimport tkinter as tk\nfrom student_system.enrolment_controller import EnrolmentController\n\nfrom utils.exception.enrolment_exceptions import EnrolmentLimitError\nfrom gui_system.exception_window import ExceptionWindow\nfrom gui_system.subject_window import SubjectWindow\n\nclass EnrolmentWindow(tk.Toplevel):\n    #window where a stud enrols in subj\n    \n    def __init__(self, parent, controller: EnrolmentController):\n        #parent: the login window\n        #student: the Student object of whoever just logged in\n        #database: the Database object, used to save changes\n\n        super().__init__(parent)\n        self.parent = parent\n\n        #the same controller the CLI menu uses.\n        self.controller = controller\n        self.title(\"GUIUniApp - Enrolment\")\n        x_position = parent.winfo_x()\n        y_position = parent.winfo_y()\n    \n        self.geometry(\"380x300+\" + str(x_position)+ \"+\"+ str(y_position))\n        self.resizable(False,False)\n\n        #if the stud closes this window, close the whole app.\n        #instead of leaving the hidden login window runing.\n        self.protocol(\"WM_DELETE_WINDOW\",self.handle_close)\n        self.build_widgets()\n        self.update_count_label()\n\n    def build_widgets(self):\n        #create everything the user sees in this window.\n        heading = tk.Label(\n            self,\n            text=\"Welcome \" + self.controller.get_student_name(),\n            font=(\"Arial\",14),\n        )\n        heading.pack(pady=(20,5))\n\n        id_label = tk.Label(self,text=\"Student ID: \"+ str(self.controller.get_student_id()))\n        id_label.pack()\n\n        #show how many subjs out of 4 the stud has.\n        self.count_label = tk.Label(self, text=\"\", font=(\"Arial\",12))\n        self.count_label.pack(pady=(15,10))\n\n        enrol_button = tk.Button(\n            self, text = \"Enrol in a Subject\", width = 20, command = self.handle_enrol\n            )\n        enrol_button.pack(pady=5)\n\n        show_button = tk.Button(\n            self, text = \"Show My Subjects\", width = 20, command = self.handle_show\n        )\n\n        show_button.pack(pady=5)\n        logout_button = tk.Button(\n            self,text =\"Logout\",width=20,command=self.handle_logout\n        )\n        logout_button.pack(pady=5)\n\n        #message shown after every action\n        self.status_label = tk.Label(self, text=\"\", fg=\"green\",wraplength=340)\n        self.status_label.pack(pady=(12,0))\n\n    def update_count_label(self):\n        #Refresh the line showing how many subs are enrolled\n        count = self.controller.count_subjects()\n        self.count_label.config(\n            text = \"Enrolled in \" + str(count) + \" out of 4 subjects\"\n        )\n\n    def handle_enrol(self):\n        #enrol the stud in one new subj\\\n        #the controller raises EnrolmentLimitError if the stud already has 4 subs\n        # and that is shown in the exception window.\n\n        try:\n            new_subject = self.controller.enrol()\n        except EnrolmentLimitError as error:\n            ExceptionWindow(self,\"Enrolment Limit\",str(error))\n            return\n        self.update_count_label()\n        self.status_label.config(\n            text = \"Enrolled in Subject-\" + new_subject.id\n            +\"  (mark \" + str(new_subject.mark)\n            +\", grade \" + new_subject.grade + \")\",\n            fg=\"green\",\n        )\n    \n    def handle_show(self):\n        #open the sub window listing all enrolled subs\n        subjects = self.controller.get_subjects()\n\n        if len(subjects) == 0:\n            ExceptionWindow(\n                self,\n                \"No Subjects\",\n                \"You are not enrolled in any subjects yet.\",\n            )\n            return\n        \n        SubjectWindow(self,subjects)\n        self.status_label.config(text=\"Showing your enrolled subjects\",fg=\"green\")\n\n    def handle_logout(self):\n        #close this window and go back to the login window.\n        self.parent.deiconify()\n        self.parent.show_message(\"You have logged out\", \"green\")\n        self.destroy()\n\n    def handle_close(self):\n        #closoing the whole application\n        self.parent.destroy()",
   "authors": {
    "Minh Nguyen": 1,
    "Rafeed Sultan": 3
   }
  },
  "gui_system/exception_window.py": {
   "text": "#exception window for the GUIUniApp.\n# this window pops up whenever something goes wrong.\n# for ex: empty login, or an attempt to enrol in a fifth subj\n# it is one of the four windows required by the marking scheme.\n\nimport tkinter as tk\n\nclass ExceptionWindow(tk.Toplevel):\n    # a small pop up window that shows one error message\n    def __init__(self, parent, title, message):\n        # parent: the window that opened this one.\n        # title: the title shown in the window bar\n        # message: the error message to show the user.\n\n        super().__init__(parent)\n\n        self.title(title)\n        self.resizable(False,False)\n        \n        # make this windows sit on top of its parent and block it.\n        # so the user has to deal with the error before carrying on.\n\n        self.transient(parent)\n        self.grab_set()\n\n        #message label\n\n        message_label = tk.Label(\n            self,\n            text=message,\n            wraplength=260,\n            justify = \"left\",\n            padx = 20,\n            pady = 20,\n        )\n        message_label.pack()\n\n        ok_button = tk.Button(self,text = \"OK\", width = 10, command = self.destroy)\n        ok_button.pack(pady=(0,15))\n\n        # wait here until the user closes this window.\n        self.wait_window()\n        \n\n",
   "authors": {
    "Rafeed Sultan": 2
   }
  },
  "gui_system/login_window.py": {
   "text": "# login window for GUIUniApp\n# this is the main window of the GUI application.\n# a student types their email and password.\n# if they are correct, the enrolment window opens.\n# registration is not available in the GUI.\n# only students who already exist in students.data can log in. There are no admin options.\n# layout follows a LabelFrame box, StringVar entries and the grid geometry manager inside the frame.\nimport tkinter as tk\n\nfrom gui_system.exception_window import ExceptionWindow\nfrom gui_system.enrolment_window import EnrolmentWindow\nfrom student_system.enrolment_controller import EnrolmentController\n\nfrom student_system.student_controller import StudentController\n\nfrom utils.exception.student_controller import LoginEmailOrPasswordEmptyError, LoginEmailFormatInvalidError, \\\n    LoginStudentNotFoundError\n\n\nclass LoginWindow(tk.Tk):\n    # the main window where a registered student logs in\n\n    def __init__(self, student_controller: StudentController, enrolment_controller: EnrolmentController):\n        # student_controller: checks the login details against students.data\n        # enrolment_controller: the same controller the CLI uses for enrolment\n\n        super().__init__()\n        self.student_controller = student_controller\n        self.enrolment_controller = enrolment_controller\n\n        self.title(\"GUIUniApp - Login\")\n        \n        self.geometry(\"440x260\")\n        self.resizable(False, False)\n\n        # StringVar objects hold whatever the user types.\n        # We read them later with .get(), as shown in Lec 10.\n        self.email_text = tk.StringVar()\n        self.password_text = tk.StringVar()\n\n        \n        self.build_widgets()\n\n    def build_widgets(self):\n        # create everything the user sees in this window\n        heading = tk.Label(self, text=\"GUIUniApp\", font=(\"Arial\", 16))\n        heading.pack(pady=(15, 5))\n\n        # a LabelFrame is a box with a title, the fields go inside it.\n        box = tk.LabelFrame(self, text=\"Student Login\", padx=15, pady=10)\n        box.pack(padx=20, pady=5, fill=\"x\")\n\n        # inside the box we use grid. the root window uses pack.\n        # that is allowed, because they are different containers.\n        email_label = tk.Label(box, text=\"Email:\")\n        email_label.grid(row=0, column=0, sticky=\"w\", pady=5)\n\n        email_field = tk.Entry(box, textvariable=self.email_text, width=30)\n        email_field.grid(row=0, column=1, pady=5)\n        email_field.focus()\n\n        password_label = tk.Label(box, text=\"Password:\")\n        password_label.grid(row=1, column=0, sticky=\"w\", pady=5)\n\n        password_field = tk.Entry(\n            box, textvariable=self.password_text, width=30, show=\"*\"\n        )\n        password_field.grid(row=1, column=1, pady=5)\n\n        login_button = tk.Button(box, text=\"Login\", width=10, command=self.login)\n        login_button.grid(row=2, column=1, sticky=\"e\", pady=(10, 0))\n\n        # message shown after every action\n        self.status_label = tk.Label(self, text=\"\", fg=\"green\")\n        self.status_label.pack(pady=(8, 0))\n\n    def clear(self):\n        # empty both entry fields\n        self.email_text.set(\"\")\n        self.password_text.set(\"\")\n\n    def show_message(self, message, colour=\"green\"):\n        # show a short message at the bottom of the login window.\n        self.status_label.config(text=message, fg=colour)\n\n    def login(self):\n        # check what the student typed and log them in if it is correct.\n\n        # three different errors are handled here:\n        # one or both fields are empty\n        # the email is not in the correct format\n        # no student with that email and password exists\n\n        try:\n            email = self.email_text.get().strip()\n            password = self.password_text.get()\n\n            # login_gui gives back a pair: (student, None) if the login worked,\n            # or (None, error) if it did not. If there is an error we raise it\n            # again, so the matching except block below shows the right window.\n            student, error = self.student_controller.login_gui(email, password)\n            if error is not None:\n                raise error\n\n            # lecture 10 clears the fields after successful login.\n            self.clear()\n            # hide the login window and open the enrolment window.\n            self.withdraw()\n\n            self.enrolment_controller.student = student\n            EnrolmentWindow(self, self.enrolment_controller)\n\n        except LoginEmailOrPasswordEmptyError:\n            self.show_message(\"Login failed\", \"red\")\n            ExceptionWindow(\n                self,\n                \"Missing Details\",\n                \"Please enter both your email and your password.\",\n            )\n        except LoginEmailFormatInvalidError:\n            self.show_message(\"Login failed\", \"red\")\n            ExceptionWindow(\n                self,\n                \"Invalid Email\",\n                \"Incorrect email format.\\n\\n\"\n                \"Emails must look like:\\n\"\n                \"firstname.lastname@university.com\",\n            )\n        except LoginStudentNotFoundError:\n            self.show_message(\"Login failed\", \"red\")\n            ExceptionWindow(\n                self,\n                \"Login Failed\",\n                \"Incorrect email or password.\\n\\n\"\n                \"Only registered students can use GUIUniApp.\",\n            )\n        except Exception as e:\n            print(f\"error logging in in login window: {e}\")",
   "authors": {
    "Rafeed Sultan": 7,
    "Minh Nguyen": 2
   }
  },
  "gui_system/subject_window.py": {
   "text": "#subs window for GUIUniApp\n#lists every subs the stud is enrolled in, with its id, mark and grade\n\nimport tkinter as tk\n\nclass SubjectWindow(tk.Toplevel):\n    #a window listing the student's enrolled subjects.\n\n    def __init__(self,parent,subjects):\n        #parent: the enrolment window\n        #subjects: the list of Subject objects to display\n\n        super().__init__(parent)\n\n        self.title(\"GUIUniApp - My Subjects\")\n        self.geometry(\"340x280\")\n        self.resizable(False,False)\n        self.transient(parent)\n\n        heading = tk.Label(self, text = \"Enrolled Subjects\", font = (\"Arial\", 14))\n        heading.pack(pady=(15,10))\n        #column headings, so numbers underneath makes sense\n\n        header_row = tk.Label(\n            self,\n            text=\"   ID        Mark      Grade\",\n            font=(\"Courier\",11,\"bold\"),\n        )\n        header_row.pack()\n        #one line per subject,\n        #courier is a fixed width font\n        #so the columns line up neatly underneath each other\n\n        for subject in subjects:\n            line = (\n                \" \"+subject.id\n                +\"        \"+str(subject.mark).rjust(3)\n                +\"         \"+subject.grade\n            )\n            row_label = tk.Label(self,text=line, font=(\"Courier\",11))\n            row_label.pack()\n\n        total_label = tk.Label(\n            self,\n            text=\"Total: \"+str(len(subjects))+\" out of 4 subjects\",\n            pady=10,\n        )\n        total_label.pack(pady=(12,0))\n\n        close_button = tk.Button(self,text= \"Close\", width = 10, command = self.destroy)\n        close_button.pack(pady=(5,15))",
   "authors": {
    "Rafeed Sultan": 2
   }
  },
  "main.py": {
   "text": "from database.database import Database\n\nfrom admin_system.admin_controller import AdminController\nfrom student_system.student_controller import StudentController\n\nfrom student_system.student_menu import StudentMenu\nfrom admin_system.admin_menu import AdminMenu\n\nfrom utils.constants import MainInputConstants\n\n\ndef main():\n    # Init db\n    database = Database(filename=\"students.data\")\n\n    # Init controllers\n    student_controller = StudentController(database)\n    admin_controller = AdminController(database)\n\n    # Init menus\n    student_menu = StudentMenu(student_controller)\n    admin_menu = AdminMenu(admin_controller)\n\n    # Main loop\n    while True:\n        user_input = input(\"University System: (A)dmin, (S)tudent, or X : \")\n        #right now typing a or s will print out invalid input\n        #sample uses capital but a tutor testing by hand may not. \n        #Rafeeds code\n        user_input = user_input.strip().upper()\n        if user_input == MainInputConstants.INPUT_STUDENT_SYSTEM:\n            student_menu.run()\n        elif user_input == MainInputConstants.INPUT_ADMIN_SYSTEM:\n            admin_menu.run()\n        elif user_input == MainInputConstants.INPUT_EXIT:\n            print(\"Thank You\")\n            break\n        else:\n            print(\"Invalid input\")\n\n\nif __name__ == \"__main__\":\n    main()",
   "authors": {
    "Rafeed Sultan": 1,
    "Willy Sandi": 1,
    "Minh Nguyen": 4
   }
  },
  "models/__init__.py": {
   "text": "",
   "authors": {
    "Minh Nguyen": 1
   }
  },
  "models/student.py": {
   "text": "from models.subject import subject_from_dict #<-- Rafeed's code\nclass Student:\n    def __init__(self, student_id, name, email, password, subjects=None):\n        self.student_id = student_id\n        self.name = name\n        self.email = email\n        self.password = password\n        self.subjects = subjects if subjects is not None else []\n\n    def convert_to_file_data(self):\n        #Rafeed's code:\n        subject_dicts = []\n        for subject in self.subjects:\n            subject_dicts.append(subject.to_dict())\n        return {\n            \"id\": self.student_id,\n            \"name\": self.name,\n            \"email\": self.email,\n            \"password\": self.password,\n            # \"subjects\": self.subjects, <- willys prev code\n            #rafeeds new code\n            \"subjects\": subject_dicts,\n        }\n\n    @classmethod\n    def create_from_file_data(cls, student_data):\n        #Rafeed's code\n        subject_objects = []\n        for subject_data in student_data[\"subjects\"]:\n            subject_objects.append(subject_from_dict(subject_data))\n        return cls(\n            student_data[\"id\"],\n            student_data[\"name\"],\n            student_data[\"email\"],\n            student_data[\"password\"],\n            # student_data[\"subjects\"], <- willys prev code\n            #Rafeeds code\n            subject_objects,\n        )\n        ",
   "authors": {
    "Rafeed Sultan": 1,
    "Willy Sandi": 3,
    "Minh Nguyen": 1
   }
  },
  "models/subject.py": {
   "text": "#every subject has an \n# id (3 digits stored as text like \"034\")\n# a mark (a no. between 25 to 100)\n\nimport random\n\nBIGGEST_ID = 999\nSMALLEST_ID = 1\nID_LENGTH = 3\n\nBIGGEST_MARK = 100\nSMALLEST_MARK = 25\n\n#helper functions\n\ndef pad_id(number): #suppose a number 54 is converted to a 3 digit text id like \"054\"\n    return str(number).zfill(ID_LENGTH)\n\n\n#uts grade distribution\n# mark < 50 is Z, mark 50 to <65 is P, mark 65 to below 75 is C, mark 75 to 85 is D, mark 85 or more is HD\n# the mark can be a whole number relating to one subject or a decimal, (like the avg mark)\n\nfrom utils.constants import MarkThresholdConstants\n\n\ndef calculate_grade(mark):\n    \"\"\"Work out the grade letter for a mark.\n\n    Uses the grade bands from utils/constants.py, so the CLI, the GUI\n    and the admin system all share one grading table.\n\n    Each constant is the upper limit of its band, for example\n    Z_NUMBER is 50, so any mark below 50 is a Z.\n\n    The mark can be a whole number (one subject) or a decimal\n    (a student's average mark).\n    \"\"\"\n    if mark < MarkThresholdConstants.Z_NUMBER:\n        return MarkThresholdConstants.Z_STRING\n    elif mark < MarkThresholdConstants.P_NUMBER:\n        return MarkThresholdConstants.P_STRING\n    elif mark < MarkThresholdConstants.C_NUMBER:\n        return MarkThresholdConstants.C_STRING\n    elif mark < MarkThresholdConstants.D_NUMBER:\n        return MarkThresholdConstants.D_STRING\n    else:\n        return MarkThresholdConstants.HD_STRING\n\n# -> making a random 3 digit id that is not already used\n# existing_ids is a list of ids the student already has, for ex: having subjects ['231','324']\n# we are trying to build a list of every id that is still free, and pick one of them at random\n# this way measn the funtion always finishes , even if nearly every id is taken\n\n#making sure every existing id are padded like 54 -> \"054\" this matches.\n\ndef generate_subject_id(existing_ids):\n    used_ids = []\n    for one_id in existing_ids:\n        used_ids.append(pad_id(one_id))\n    \n    #collecting every id that is still availble\n    free_ids = []\n    for number in range(SMALLEST_ID,BIGGEST_ID+1):\n        padded = pad_id(number)\n        if padded not in used_ids:\n            free_ids.append(padded)\n\n    if len(free_ids) ==0:\n        raise RuntimeError(\"There are no subject ids left\")\n    \n    return random.choice(free_ids)\n\n\n#a random mark betwee 25 to 100\n\ndef generate_mark():\n    return random.randint(SMALLEST_MARK,BIGGEST_MARK)\n\n# subject class\n#one subject that a sutdent is enrolled\n#subject_id = 3 digit it as text for ex: \"032\"\n#mark = a number between 25 and 100\n#grade = it is only passed in when we load a subject back from students.data.\nclass Subject:\n    def __init__(self, subject_id, mark, grade = None):\n        self.id = pad_id(subject_id)\n        self.mark = mark\n\n        if grade is None:\n            self.grade = calculate_grade(mark)\n        else:\n            self.grade = grade\n    \n    def to_dict(self):\n        #turining this subj into a dict so it can be saved into students.data as JSON\n\n        return {\n            \"id\": self.id,\n            \"mark\": self.mark,\n            \"grade\": self.grade,\n\n        }\n\n    def __str__(self):\n        #it should look like [ Subject::053 -- mark = 93 -- grade = HD ]\n        #grade is padded to 3 chars so that \"P\" and \"HD\" line up on the same column\n        padded_grade = self.grade.rjust(3)\n        return \"[ Subject::\" + self.id + \" -- mark = \" + str(self.mark) \\\n                + \" -- grade = \" + padded_grade + \" ]\"\n    \n\n#    a brand new subj for a stud who enrolling\n# the id mark and grade are all generated automatically, cuz student deos not choose any of them\n    \ndef create_new_subject(existing_ids):\n    new_id = generate_subject_id(existing_ids)\n    new_mark = generate_mark()\n    return Subject(new_id, new_mark)\n\n# rebuilding a subj from a dict reads out  of students.data.\ndef subject_from_dict(data):\n    subject_id = data[\"id\"]\n    mark = data[\"mark\"]\n\n    #older records might not have a grade saved \n    if \"grade\" in data:\n        grade = data [\"grade\"]\n    else:\n        grade = None\n    return Subject(subject_id,mark,grade)\n\n\n    \n\n",
   "authors": {
    "Rafeed Sultan": 3,
    "Minh Nguyen": 1
   }
  },
  "student_system/__init__.py": {
   "text": "",
   "authors": {
    "Minh Nguyen": 1
   }
  },
  "student_system/enrolment_controller.py": {
   "text": "#enrolment rules for one logged in student: enrol, remove, change password.\n#every change is saved to students.data straight away.\n#printing and input() are done by EnrolmentMenu (CLI) and EnrolmentWindow (GUI).\n\nfrom models.subject import create_new_subject, pad_id\nfrom utils.constants import SubjectConstants\nfrom utils.exception.enrolment_exceptions import (\n    EnrolmentLimitError,\n    SubjectNotFoundError,\n)\n\n#kept under this name because enrolment_menu.py imports it from here.\nMAX_SUBJECTS = SubjectConstants.MAX_SUBJECTS\n\n#enrolment work for one logged in student\n#student: Student object of the person who just logged in\n#database: Database object, used to save changes to the file\nclass EnrolmentController:\n    def __init__(self, student, database):\n        self.student = student\n        self.database = database\n\n    def get_subjects(self):\n        #returns the list of subjects the student has.\n        return self.student.subjects\n\n    def count_subjects(self):\n        #returns how many subjects the student has.\n        return len(self.student.subjects)\n\n    #enrol the student in one new subject.\n    #raises EnrolmentLimitError if they already have MAX_SUBJECTS subjects.\n    #returns the new subject so the menu can print it.\n    def enrol(self):\n\n        #checking the limit first, so nothing changes when it is reached.\n        if self.count_subjects() >= MAX_SUBJECTS:\n            raise EnrolmentLimitError(\n                \"Students are allowed to enrol in \" + str(MAX_SUBJECTS) + \" subjects only.\"\n            )\n\n        #collect the ids the student already has so the new id is different.\n        existing_ids = []\n        for subject in self.student.subjects:\n            existing_ids.append(subject.id)\n\n        new_subject = create_new_subject(existing_ids)\n        self.student.subjects.append(new_subject)\n\n        #saving this to students.data straight away.\n        self.save_student()\n        return new_subject\n\n    def remove(self, subject_id):\n        #remove one subject by its id.\n        #raises SubjectNotFoundError if the student does not have that subject.\n        #the student might type 97 instead of 097, so the id is padded first.\n        wanted_id = pad_id(subject_id)\n\n        #look through the student's subjects for a matching id.\n        subject_to_remove = None\n        for subject in self.student.subjects:\n            if subject.id == wanted_id:\n                subject_to_remove = subject\n                break\n\n        if subject_to_remove is None:\n            raise SubjectNotFoundError(\n                \"Subject \" + str(subject_id) + \" does not exist\"\n            )\n        self.student.subjects.remove(subject_to_remove)\n\n        #saving to students.data straight away.\n        self.save_student()\n\n    #change the student's password and save it.\n    #the menu has already checked the password format.\n    def change_password(self, new_password):\n        self.student.password = new_password\n        self.save_student()\n\n    def save_student(self):\n        #write this student back to students.data.\n        #the database stores plain dicts, so the Student has to be\n        #converted first, and it is matched on its id.\n        self.database.update_student(\n            self.student.student_id, self.student.convert_to_file_data()\n        )\n\n    def get_student_id(self):\n        return self.student.student_id\n\n    def get_student_name(self):\n        return self.student.name\n",
   "authors": {
    "Rafeed Sultan": 2,
    "Minh Nguyen": 1,
    "Willy Sandi": 1
   }
  },
  "student_system/enrolment_menu.py": {
   "text": "#(c/e/r/s/x) menu a student sees after loggin in.\n#printing and all input() calls happen in this file.\n#the work is passed to enrolment controller.\nimport re\nfrom student_system.enrolment_controller import MAX_SUBJECTS\nfrom utils.constants import(\n    EnrolmentMenuInputConstants,\n    StudentValidationConstants,\n)\n\nfrom utils.exception.enrolment_exceptions import (\n    EnrolmentLimitError,\n    SubjectNotFoundError\n)\n\n# giving some added colour flairs to the terminal to match the sample output.\nRED = \"\\033[91m\"\nYELLOW = \"\\033[93m\"\nCYAN = \"\\033[96m\"\nRESET = \"\\033[0m\"\n\nclass EnrolmentMenu:\n\n    def __init__(self, controller):\n        self.controller = controller\n\n    def run(self):\n\n        while True:\n            choice = input(\n                CYAN + \"\\t\\tStudent Course Menu (c/e/r/s/x): \" + RESET\n            )\n            choice = choice.strip().lower()\n\n            if choice == EnrolmentMenuInputConstants.INPUT_CHANGE_PASSWORD:\n                self.change_password()\n            elif choice == EnrolmentMenuInputConstants.INPUT_ENROL:\n                self.enrol()\n            elif choice == EnrolmentMenuInputConstants.INPUT_REMOVE:\n                self.remove()\n            elif choice == EnrolmentMenuInputConstants.INPUT_SHOW:\n                self.show()\n            elif choice == EnrolmentMenuInputConstants.INPUT_EXIT:\n                break\n            else:\n                print(RED + \"\\t\\tInvalid choice\" + RESET)\n\n#enrol\n    def enrol(self):\n#enrol in a new sub and print result\n        try:\n            new_subject = self.controller.enrol()\n        except EnrolmentLimitError as error:\n            print(RED + \"\\t\\t\" + str(error) + RESET)\n            return\n#sample shows \"Subect-97\" unpadded here. to match it\n#exactly\n#replace new_subject.id with str(int(new_subject.id)).\n        print(YELLOW + \"\\t\\tEnrolling in Subject-\" + new_subject.id + RESET)\n        self.print_enrolment_count()\n\n\n    def remove(self):\n #ask for a sub id and remove that subject\n        subject_id = input(\"\\t\\tRemove Subject by ID: \").strip()\n\n        try:\n            self.controller.remove(subject_id)\n        except SubjectNotFoundError as error:\n            print(RED + \"\\t\\t\" + str(error) + RESET)\n            return\n\n        print(YELLOW + \"\\t\\tDropping Subject-\" + subject_id + RESET)\n        self.print_enrolment_count()\n\n\n\n    def show(self):\n#print every subs the student is enrolled in\n        subjects = self.controller.get_subjects()\n\n        print(YELLOW + \"\\t\\tShowing \" + str(len(subjects)) + \" subjects\" + RESET)\n\n        for subject in subjects:\n            print(\"\\t\\t\" + str(subject))\n\n\n    def change_password(self):\n        #ask for a new pass, check its format, confirm it, then save.\n        print(YELLOW + \"\\t\\tUpdating Password\" + RESET)\n\n        #keep asking until the password matches the required format.\n        while True:\n            new_password = input(\"\\t\\tNew Password: \")\n            if re.match(StudentValidationConstants.PASSWORD_PATTERN,new_password):\n                break\n            print(RED + \"\\t\\tIncorrect password format\"+RESET)\n\n        # Keep asking for the confirmation until it matches.\n        #without this, a stud could set a password they can\n        #never login with, cuz login checks the same rules.\n        while True:\n            confirm_password = input(\"\\t\\tConfirm Password: \")\n            if confirm_password == new_password:\n                break\n            print(RED + \"\\t\\tPassword does not match - try again\" + RESET)\n\n        self.controller.change_password(new_password)\n\n\n\n    def print_enrolment_count(self):\n\n        count = self.controller.count_subjects()\n        print(\n            YELLOW + \"\\t\\tYou are now enrolled in \" + str(count)\n            + \" out of \" + str(MAX_SUBJECTS)+ \" subjects\"+  RESET\n        )",
   "authors": {
    "Willy Sandi": 1,
    "Rafeed Sultan": 2
   }
  },
  "student_system/student_controller.py": {
   "text": "import random\nimport re\n\nfrom models.student import Student\n\nfrom utils.constants import StudentIdConstants, StudentValidationConstants\n\nfrom utils.exception.database import CreateStudentError\nfrom utils.exception.student_controller import (LoginGUIError,\n                                                LoginEmailOrPasswordEmptyError,\n                                                LoginEmailFormatInvalidError,\n                                                LoginStudentNotFoundError)\n\n# giving some added colour flairs to the terminal to match the sample output.\nRED = \"\\033[91m\"\nYELLOW = \"\\033[93m\"\nRESET = \"\\033[0m\"\n\n\nclass StudentController:\n    def __init__(self, database):\n        self.database = database\n\n    def is_valid_credentials(self, email, password):\n        email_is_valid = re.match(StudentValidationConstants.EMAIL_PATTERN, email) is not None\n        password_is_valid = re.match(StudentValidationConstants.PASSWORD_PATTERN, password) is not None\n        return email_is_valid and password_is_valid\n\n    def ask_for_valid_credentials(self):\n        while True:\n            email = input(\"\\tEmail: \")\n            password = input(\"\\tPassword: \")\n\n            if self.is_valid_credentials(email, password):\n                print(YELLOW + \"\\temail and password formats acceptable\" + RESET)\n                return email, password\n\n            print(RED + \"\\tIncorrect email or password format\" + RESET)\n\n    def generate_unique_id(self):\n        while True:\n            student_id = f\"{random.randint(StudentIdConstants.ID_MIN, StudentIdConstants.ID_MAX):0{StudentIdConstants.ID_LENGTH}d}\"\n            if self.database.get_student_by_id(student_id) is None:\n                return student_id\n\n    def register(self):\n        print(\"\\tStudent Sign Up\")\n        email, password = self.ask_for_valid_credentials()\n\n        existing_student = self.database.get_student_by_email(email)\n        if existing_student is not None:\n            print(f\"\\tStudent {existing_student['name']} already exists\")\n            return\n\n        name = \"\"\n        while name == \"\":\n            name = input(\"\\tName: \").strip()\n\n        new_student = Student(self.generate_unique_id(), name, email, password)\n        try:\n            self.database.create_student(new_student.convert_to_file_data())\n            print(f\"\\tEnrolling Student {name}\")\n        except CreateStudentError:\n            print(\"\\tCould not save student, please try again\")\n\n    def login(self):\n        print(\"\\tStudent Sign In\")\n        email, password = self.ask_for_valid_credentials()\n\n        student_data = self.database.get_student_by_email(email)\n        if student_data is None or student_data[\"password\"] != password:\n            print(\"\\tStudent does not exist\")\n            return None\n\n        return Student.create_from_file_data(student_data)\n\n    def login_gui(self, email, password):\n        try:\n            if email == \"\" or password == \"\":\n                raise LoginEmailOrPasswordEmptyError\n            #prev code for willy\n            # is_email_valid = re.match(StudentValidationConstants.EMAIL_PATTERN, email) is not None\n            # if not is_email_valid:\n                # raise LoginEmailFormatInvalidError\n            #new code for rafeed\n            if re.match(StudentValidationConstants.EMAIL_PATTERN, email) is None:\n                raise LoginEmailFormatInvalidError\n\n            student = self.database.get_student_by_email(email)\n            if student is None or student[\"password\"] != password:\n                raise LoginStudentNotFoundError\n\n            return Student.create_from_file_data(student), None\n        except (LoginEmailOrPasswordEmptyError,\n                LoginEmailFormatInvalidError,\n                LoginStudentNotFoundError) as e:\n            # send back WHICH error happened, so the window can show the right message\n            return None, e",
   "authors": {
    "Willy Sandi": 5,
    "Rafeed Sultan": 1,
    "Minh Nguyen": 4
   }
  },
  "student_system/student_menu.py": {
   "text": "from student_system.student_controller import StudentController\n\n# Rafeed's code - Subject Enrolment System\nfrom student_system.enrolment_controller import EnrolmentController\nfrom student_system.enrolment_menu import EnrolmentMenu\n\nfrom utils.constants import StudentMenuInputConstants\n\n\nclass StudentMenu:\n    def __init__(self, controller: StudentController):\n        self.controller = controller\n\n    def run(self):\n        while True:\n            user_input = input(\"Student system (l/r/x): \")\n            if user_input == StudentMenuInputConstants.INPUT_LOGIN:\n                student = self.controller.login()\n                if student is not None:\n                    self.open_enrolment_menu(student)\n            elif user_input == StudentMenuInputConstants.INPUT_REGISTER:\n                self.controller.register()\n            elif user_input == StudentMenuInputConstants.INPUT_EXIT:\n                break\n            else:\n                print(\"Invalid input\")\n\n\n# Rafeeds code- enrolment menu system\n    def open_enrolment_menu(self, student):\n\n        enrolment_controller = EnrolmentController(\n            student, self.controller.database\n        )\n        enrolment_menu = EnrolmentMenu(enrolment_controller)\n        enrolment_menu.run()",
   "authors": {
    "Willy Sandi": 1,
    "Rafeed Sultan": 1,
    "Minh Nguyen": 3
   }
  },
  "students.data": {
   "text": "[\n  {\n    \"email\": \"test@gmail.com\",\n    \"password\": \"1234\",\n    \"id\": \"000001\",\n    \"name\": \"Minh Nguyen\",\n    \"subjects\": [\n      {\n        \"id\": \"001\",\n        \"mark\": 50,\n        \"grade\": \"P\"\n      },\n      {\n        \"id\": \"002\",\n        \"mark\": 60,\n        \"grade\": \"P\"\n      }\n    ]\n  },\n  {\n    \"email\": \"john.smith@university.com\",\n    \"password\": \"Password123\",\n    \"id\": \"673358\",\n    \"name\": \"John Smith\",\n    \"subjects\": [\n      {\n        \"id\": \"541\",\n        \"mark\": 72,\n        \"grade\": \"C\"\n      },\n      {\n        \"id\": \"455\",\n        \"mark\": 81,\n        \"grade\": \"D\"\n      },\n      {\n        \"id\": \"742\",\n        \"mark\": 58,\n        \"grade\": \"P\"\n      },\n      {\n        \"id\": \"097\",\n        \"mark\": 62,\n        \"grade\": \"P\"\n      }\n    ]\n  },\n  {\n    \"email\": \"alen.jones@university.com\",\n    \"password\": \"Sunshine456\",\n    \"id\": \"762740\",\n    \"name\": \"Alen Jones\",\n    \"subjects\": [\n      {\n        \"id\": \"118\",\n        \"mark\": 55,\n        \"grade\": \"P\"\n      },\n      {\n        \"id\": \"236\",\n        \"mark\": 72,\n        \"grade\": \"C\"\n      }\n    ]\n  },\n  {\n    \"email\": \"sarah.lee@university.com\",\n    \"password\": \"Universe789\",\n    \"id\": \"104582\",\n    \"name\": \"Sarah Lee\",\n    \"subjects\": []\n  },\n  {\n    \"email\": \"david.brown@university.com\",\n    \"password\": \"Morning2024\",\n    \"id\": \"248913\",\n    \"name\": \"David Brown\",\n    \"subjects\": [\n      {\n        \"id\": \"310\",\n        \"mark\": 30,\n        \"grade\": \"Z\"\n      },\n      {\n        \"id\": \"421\",\n        \"mark\": 42,\n        \"grade\": \"Z\"\n      },\n      {\n        \"id\": \"509\",\n        \"mark\": 48,\n        \"grade\": \"Z\"\n      }\n    ]\n  },\n  {\n    \"email\": \"emma.wilson@university.com\",\n    \"password\": \"Welcome999\",\n    \"id\": \"391027\",\n    \"name\": \"Emma Wilson\",\n    \"subjects\": [\n      {\n        \"id\": \"614\",\n        \"mark\": 88,\n        \"grade\": \"HD\"\n      },\n      {\n        \"id\": \"723\",\n        \"mark\": 79,\n        \"grade\": \"D\"\n      }\n    ]\n  },\n  {\n    \"email\": \"chris.taylor@university.com\",\n    \"password\": \"Galaxy7777\",\n    \"id\": \"557301\",\n    \"name\": \"Chris Taylor\",\n    \"subjects\": [\n      {\n        \"id\": \"805\",\n        \"mark\": 91,\n        \"grade\": \"HD\"\n      },\n      {\n        \"id\": \"932\",\n        \"mark\": 87,\n        \"grade\": \"HD\"\n      }\n    ]\n  },\n  {\n    \"id\": \"960377\",\n    \"name\": \"Willy\",\n    \"email\": \"willy.sandi@university.com\",\n    \"password\": \"Helloworld123\",\n    \"subjects\": []\n  }\n]",
   "authors": {
    "Willy Sandi": 1,
    "Rafeed Sultan": 1,
    "Minh Nguyen": 3
   }
  },
  "tests/test_database.py": {
   "text": "import json\nimport os\nimport unittest\n\nfrom database.database import Database\n\nclass DatabaseTest(unittest.TestCase):\n    def setUp(self):\n        self.database = Database(\"students.data.test\")\n\n    def tearDown(self):\n        os.remove(\"students.data.test\")\n\n    def test_create_student(self):\n        email = \"test@gmail.com\"\n        password = \"1234\"\n\n        student = {\n            \"email\": email,\n            \"password\": password,\n            \"id\": \"000001\",\n            \"name\": \"Minh Nguyen\",\n            \"subjects\": [\n                {\n                    \"id\": \"001\",\n                    \"mark\": 50,\n                    \"grade\": \"P\"\n                }\n            ]\n        }\n\n        self.database.create_student(student)\n\n        student = self.database.get_student_by_id(\"000001\")\n        self.assertEqual(student[\"email\"], email)\n        self.assertEqual(student[\"password\"], password)\n\n    def test_save_students(self):\n        self.database.students = [\n            {\n                \"email\": \"test@gmail.com\",\n                \"password\": \"1234\",\n                \"id\": \"000001\",\n                \"name\": \"Minh Nguyen\",\n                \"subjects\": [\n                    {\n                        \"id\": \"001\",\n                        \"mark\": 50,\n                        \"grade\": \"P\"\n                    }\n                ]\n            }\n        ]\n\n        self.database.save_students()\n        with self.database.file.open(\"r\", encoding=\"utf-8\") as f:\n            students = json.load(f)\n\n            self.assertEqual(len(students), 1)\n",
   "authors": {
    "Minh Nguyen": 1
   }
  },
  "tests/test_gui_main.py": {
   "text": "import unittest\nfrom unittest.mock import patch\n\nimport gui_main\n\nclass GuiMainTest(unittest.TestCase):\n    def setUp(self):\n        self.database_cls = self.start_patch(\"gui_main.Database\")\n        self.student_controller_cls = self.start_patch(\"gui_main.StudentController\")\n        self.enrolment_controller_cls = self.start_patch(\"gui_main.EnrolmentController\")\n        self.login_window_cls = self.start_patch(\"gui_main.LoginWindow\")\n\n    def start_patch(self, target):\n        patcher = patch(target)\n        self.addCleanup(patcher.stop)\n        return patcher.start()\n\n    def test_database_uses_shared_file(self):\n        gui_main.main()\n\n        self.database_cls.assert_called_once_with(filename=\"students.data\")\n\n    def test_controllers_wired_to_database(self):\n        gui_main.main()\n\n        database = self.database_cls.return_value\n        self.student_controller_cls.assert_called_once_with(database)\n        self.enrolment_controller_cls.assert_called_once_with(None, database=database)\n\n    def test_login_window_created_and_mainloop_started(self):\n        gui_main.main()\n\n        self.login_window_cls.assert_called_once_with(\n            self.student_controller_cls.return_value,\n            self.enrolment_controller_cls.return_value,\n        )\n        self.login_window_cls.return_value.mainloop.assert_called_once()\n",
   "authors": {
    "Willy Sandi": 1
   }
  },
  "tests/test_main.py": {
   "text": "import unittest\nfrom unittest.mock import patch, call\n\nimport main\nfrom utils.constants import MainInputConstants\n\nclass MainTest(unittest.TestCase):\n    def setUp(self):\n        self.database_cls = self.start_patch(\"main.Database\")\n        self.student_controller_cls = self.start_patch(\"main.StudentController\")\n        self.admin_controller_cls = self.start_patch(\"main.AdminController\")\n        self.student_menu_cls = self.start_patch(\"main.StudentMenu\")\n        self.admin_menu_cls = self.start_patch(\"main.AdminMenu\")\n        self.mock_print = self.start_patch(\"builtins.print\")\n\n        self.student_menu = self.student_menu_cls.return_value\n        self.admin_menu = self.admin_menu_cls.return_value\n\n    def start_patch(self, target):\n        patcher = patch(target)\n        self.addCleanup(patcher.stop)\n        return patcher.start()\n\n    def run_main(self, inputs):\n        with patch(\"builtins.input\", side_effect=inputs):\n            main.main()\n\n    def test_wiring(self):\n        self.run_main([MainInputConstants.INPUT_EXIT])\n\n        self.database_cls.assert_called_once_with(filename=\"students.data\")\n        database = self.database_cls.return_value\n        self.student_controller_cls.assert_called_once_with(database)\n        self.admin_controller_cls.assert_called_once_with(database)\n        self.student_menu_cls.assert_called_once_with(self.student_controller_cls.return_value)\n        self.admin_menu_cls.assert_called_once_with(self.admin_controller_cls.return_value)\n\n    def test_exit_prints_thank_you(self):\n        self.run_main([MainInputConstants.INPUT_EXIT])\n\n        self.mock_print.assert_called_once_with(\"Thank You\")\n        self.student_menu.run.assert_not_called()\n        self.admin_menu.run.assert_not_called()\n\n    def test_student_option_runs_student_menu(self):\n        self.run_main([MainInputConstants.INPUT_STUDENT_SYSTEM, MainInputConstants.INPUT_EXIT])\n\n        self.student_menu.run.assert_called_once()\n        self.admin_menu.run.assert_not_called()\n\n    def test_admin_option_runs_admin_menu(self):\n        self.run_main([MainInputConstants.INPUT_ADMIN_SYSTEM, MainInputConstants.INPUT_EXIT])\n\n        self.admin_menu.run.assert_called_once()\n        self.student_menu.run.assert_not_called()\n\n    def test_lowercase_and_whitespace_accepted(self):\n        self.run_main([\"  s \", \" a\", \"x\"])\n\n        self.student_menu.run.assert_called_once()\n        self.admin_menu.run.assert_called_once()\n        self.mock_print.assert_called_once_with(\"Thank You\")\n\n    def test_invalid_input(self):\n        self.run_main([\"foo\", MainInputConstants.INPUT_EXIT])\n\n        self.assertEqual(self.mock_print.call_args_list, [call(\"Invalid input\"), call(\"Thank You\")])\n        self.student_menu.run.assert_not_called()\n        self.admin_menu.run.assert_not_called()\n\n    def test_multiple_rounds(self):\n        self.run_main([\n            MainInputConstants.INPUT_STUDENT_SYSTEM,\n            MainInputConstants.INPUT_STUDENT_SYSTEM,\n            MainInputConstants.INPUT_ADMIN_SYSTEM,\n            MainInputConstants.INPUT_EXIT,\n        ])\n\n        self.assertEqual(self.student_menu.run.call_count, 2)\n        self.assertEqual(self.admin_menu.run.call_count, 1)\n",
   "authors": {
    "Willy Sandi": 1
   }
  },
  "utils/__init__.py": {
   "text": "",
   "authors": {
    "Minh Nguyen": 1
   }
  },
  "utils/constants.py": {
   "text": "# CLI input option\nclass MainInputConstants:\n    INPUT_ADMIN_SYSTEM = \"A\"\n    INPUT_STUDENT_SYSTEM = \"S\"\n    INPUT_EXIT = \"X\"\n\nclass StudentMenuInputConstants:\n    INPUT_LOGIN = \"l\"\n    INPUT_REGISTER = \"r\"\n    INPUT_EXIT = \"x\"\n\nclass AdminMenuInputConstants:\n    INPUT_CLEAR_DATABASE = \"c\"\n    INPUT_GROUP_STUDENTS = \"g\"\n    INPUT_PARTITION_STUDENTS = \"p\"\n    INPUT_REMOVE_STUDENT = \"r\"\n    INPUT_SHOW = \"s\"\n    INPUT_EXIT = \"x\"\n\n# Mark threshold\nclass MarkThresholdConstants:\n    Z_NUMBER = 50\n    P_NUMBER = 65\n    C_NUMBER = 75\n    D_NUMBER = 85\n    HD_NUMBER = 100\n\n    Z_STRING = \"Z\"\n    P_STRING = \"P\"\n    C_STRING = \"C\"\n    D_STRING = \"D\"\n    HD_STRING = \"HD\"\n\nclass PassThresholdConstants:\n    PASS = 50\n\nclass StudentValidationConstants:\n    EMAIL_PATTERN = r\"^[a-zA-Z]+\\.[a-zA-Z]+@university\\.com$\"\n    # upper-case first letter, then at least 5 letters in total, then 3+ digits\n    PASSWORD_PATTERN = r\"^[A-Z][a-zA-Z]{4,}[0-9]{3,}$\"\n\nclass StudentIdConstants:\n    ID_MIN = 1\n    ID_MAX = 999999\n    ID_LENGTH = 6\n\nclass EnrolmentMenuInputConstants:\n    INPUT_CHANGE_PASSWORD = \"c\"\n    INPUT_ENROL = \"e\"\n    INPUT_REMOVE = \"r\"\n    INPUT_SHOW = \"s\"\n    INPUT_EXIT = \"x\"\n\nclass SubjectConstants:\n    ID_MIN = 1\n    ID_MAX = 999\n    ID_LENGTH = 3\n    MARK_MIN = 25\n    MARK_MAX = 100\n    MAX_SUBJECTS = 4\n",
   "authors": {
    "Willy Sandi": 2,
    "Rafeed Sultan": 1,
    "Minh Nguyen": 2
   }
  },
  "utils/exception/__init__.py": {
   "text": "",
   "authors": {
    "Minh Nguyen": 1
   }
  },
  "utils/exception/admin_controller.py": {
   "text": "class ClearDatabaseError(Exception):\n    pass\n\nclass GroupStudentsError(Exception):\n    pass\n\nclass PartitionStudentsError(Exception):\n    pass\n\nclass RemoveStudentError(Exception):\n    pass\n\nclass ShowStudentsError(Exception):\n    pass",
   "authors": {
    "Minh Nguyen": 1
   }
  },
  "utils/exception/database.py": {
   "text": "class CreateDatabaseFileError(Exception):\n    pass\n\nclass LoadStudentDataError(Exception):\n    pass\n\nclass CreateStudentError(Exception):\n    pass\n\nclass SaveStudentsError(Exception):\n    pass\n\nclass GetStudentByIdError(Exception):\n    pass\n\nclass GetStudentByEmailError(Exception):\n    pass\n\nclass UpdateStudentError(Exception):\n    pass\n\nclass DeleteStudentError(Exception):\n    pass\n\nclass DeleteAllStudentsError(Exception):\n    pass",
   "authors": {
    "Minh Nguyen": 1
   }
  },
  "utils/exception/enrolment_exceptions.py": {
   "text": "class EnrolmentLimitError(Exception):\n#when a stud tries to enrol for the fifth subj\n    pass\n\nclass SubjectNotFoundError(Exception):\n#when a stud tries to remove a subj they do not have\n    pass\n",
   "authors": {
    "Rafeed Sultan": 1
   }
  },
  "utils/exception/student_controller.py": {
   "text": "class LoginGUIError(Exception):\n    pass\n\nclass LoginEmailOrPasswordEmptyError(Exception):\n    pass\n\nclass LoginEmailFormatInvalidError(Exception):\n    pass\n\nclass LoginCredentialInvalidError(Exception):\n    pass\n\nclass LoginStudentNotFoundError(Exception):\n    pass\n",
   "authors": {
    "Minh Nguyen": 1
   }
  }
 },
 "commits": [
  {
   "hash": "08e1527",
   "author": "Willy Sandi",
   "date": "2026-10-07",
   "subject": "test: add unit tests for main and gui_main entry points"
  },
  {
   "hash": "7a8b622",
   "author": "Willy Sandi",
   "date": "2026-10-06",
   "subject": "change the cli login error and add color error"
  },
  {
   "hash": "60660b2",
   "author": "Willy Sandi",
   "date": "2026-10-06",
   "subject": "feat: colour the credential format messages in the CLI"
  },
  {
   "hash": "5183236",
   "author": "Willy Sandi",
   "date": "2026-10-06",
   "subject": "fix: remove duplicated password prompt in change password flow"
  },
  {
   "hash": "8085a96",
   "author": "Rafeed Sultan",
   "date": "2026-10-06",
   "subject": "feat: some slight gui fixes, and cli login issues."
  },
  {
   "hash": "dbe144d",
   "author": "Minh Nguyen",
   "date": "2026-10-05",
   "subject": "fix bug refactor gui"
  },
  {
   "hash": "2b9c763",
   "author": "Minh Nguyen",
   "date": "2026-10-05",
   "subject": "refactor login gui"
  },
  {
   "hash": "ebbbb98",
   "author": "Willy Sandi",
   "date": "2026-10-05",
   "subject": "add stundent login and feature for CLI, also change the password pattern based on requirements"
  },
  {
   "hash": "8510ce9",
   "author": "Rafeed Sultan",
   "date": "2026-10-03",
   "subject": "feat: fixes in geometry and some codes. works now"
  },
  {
   "hash": "7fad3a7",
   "author": "Rafeed Sultan",
   "date": "2026-10-03",
   "subject": "feat: fixes in login_window.py, another typo."
  },
  {
   "hash": "0babef0",
   "author": "Rafeed Sultan",
   "date": "2026-10-03",
   "subject": "feat: typo fix in TK to Tk"
  },
  {
   "hash": "ebb6df6",
   "author": "Rafeed Sultan",
   "date": "2026-10-03",
   "subject": "feat: fixes in the import and some data addition files in student.data"
  },
  {
   "hash": "9debabc",
   "author": "Rafeed Sultan",
   "date": "2026-10-03",
   "subject": "feat: updating the readme.md file"
  },
  {
   "hash": "d3f431a",
   "author": "Rafeed Sultan",
   "date": "2026-10-03",
   "subject": "feat: align enrolment menu and GUI with spec and Lecture 10"
  },
  {
   "hash": "0a60104",
   "author": "Rafeed Sultan",
   "date": "2026-10-03",
   "subject": "feat: created an exception window which will store all the actions."
  },
  {
   "hash": "971dad2",
   "author": "Rafeed Sultan",
   "date": "2026-10-03",
   "subject": "feat: added the skeleton framework of the gui"
  },
  {
   "hash": "aa3fb7f",
   "author": "Rafeed Sultan",
   "date": "2026-09-23",
   "subject": "feat: fixes at willy and minh's code"
  },
  {
   "hash": "5d15e8f",
   "author": "Rafeed Sultan",
   "date": "2026-09-23",
   "subject": "feat: enrolment_menu done."
  },
  {
   "hash": "c1c4a94",
   "author": "Rafeed Sultan",
   "date": "2026-09-23",
   "subject": "feat: created the enrolment controller of giving them the necessary functionalities."
  },
  {
   "hash": "5e63454",
   "author": "Rafeed Sultan",
   "date": "2026-09-23",
   "subject": "feat: add the subject class and the enrolment exceptions"
  },
  {
   "hash": "77f7e1d",
   "author": "Rafeed Sultan",
   "date": "2026-09-23",
   "subject": "feat: checking publishing branch"
  },
  {
   "hash": "591d431",
   "author": "Willy Sandi",
   "date": "2026-09-23",
   "subject": "move constants to constants.py"
  },
  {
   "hash": "171d89e",
   "author": "Willy Sandi",
   "date": "2026-09-22",
   "subject": "add student logic"
  },
  {
   "hash": "466955d",
   "author": "Willy Sandi",
   "date": "2026-09-22",
   "subject": "add student logic"
  },
  {
   "hash": "81d7c96",
   "author": "Willy Sandi",
   "date": "2026-09-22",
   "subject": "add student logic"
  },
  {
   "hash": "4cc4ca2",
   "author": "Willy Sandi",
   "date": "2026-09-22",
   "subject": "add student logic"
  },
  {
   "hash": "7dfcf50",
   "author": "Willy Sandi",
   "date": "2026-09-22",
   "subject": "First Commit"
  },
  {
   "hash": "d14630c",
   "author": "Minh Nguyen",
   "date": "2026-09-21",
   "subject": "add admin_system logic"
  },
  {
   "hash": "7fffcba",
   "author": "Minh Nguyen",
   "date": "2026-09-21",
   "subject": "add database code, tests and a few constants as well as exceptions"
  },
  {
   "hash": "ada4357",
   "author": "Minh Nguyen",
   "date": "2026-09-21",
   "subject": "add main, student and admin menu"
  },
  {
   "hash": "6735435",
   "author": "Minh Nguyen",
   "date": "2026-09-21",
   "subject": "init project structure"
  },
  {
   "hash": "ced1ac3",
   "author": "minhshing",
   "date": "2026-09-21",
   "subject": "Initial commit"
  }
 ]
};
