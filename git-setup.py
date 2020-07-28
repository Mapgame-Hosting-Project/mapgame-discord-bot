from shutil import copy
import os
import subprocess
import sys

copy("README.html", "docs/README.html")
os.remove("README.html")

subprocess.call(["git", "add", "."])
subprocess.call(["git", "commit", "-m", sys.argv[1]])
subprocess.call(["git", "push"])