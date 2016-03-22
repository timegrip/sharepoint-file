sharepoint-file
===============

[![NPM](https://nodei.co/npm/sharepoint-file.png?stars&downloads)](https://nodei.co/npm/sharepoint-file/)

A command-line utility for Sharepoint file operations

:information_source: Currently supports only download of individual files from an online Sharepoint site / file storage.

Installation or update
----------------------

```
$ npm install -g sharepoint-file
```

Usage
-----

$ **spfile** task args

**Available tasks:** (use --help for more info)

    fetch [options] <FILEURL> [filepath] ... Fetches a file and shows its content or saves it
                                             <FILEURL>  The full Sharepoint URL to the file
                                             [filepath] File name or file path to save to
          [-u] ............................. User credentials as emailaddress:password

                                             Example: spfile fetch https://your.sharepoint.com/path/foo.json
                                             Example: spfile fetch https://your.sharepoint.com/path/bar.pdf bar.pdf

    login [options] <HOSTURL> .............. Authenticates with Sharepoint explicitly
                                             <HOSTURL> The Sharepoint host URL
          [-u] ............................. User credentials as emailaddress:password

                                             Example: spfile login https://your.sharepoint.com

    logout ................................. Invalidates your Sharepoint session explicitly

**Options:**

    --silent ............................... Suppresses most console output

License
-------

The MIT License ([MIT](http://choosealicense.com/licenses/mit/))

Copyright (c) 2016 [Timegrip](http://timegrip.no)
