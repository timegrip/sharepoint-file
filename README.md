sharepoint-file
===============

[![NPM](https://nodei.co/npm/sharepoint-file.png?stars&downloads)](https://nodei.co/npm/sharepoint-file/)

A command-line utility for Sharepoint file operations

:warning: Currently supports download of **small(er) single files** from an online Sharepoint site / file storage.

Installation or update
----------------------

```
$ npm install -g sharepoint-file
```

Usage
-----

$ **spfile** task args

**Available tasks:** (use --help for more info)

    fetch <FILEURL> [FILEPATH] ... Fetches a file and shows its content or saves it
                                   <FILEURL>  The full Sharepoint URL to the file
                                   [FILEPATH] File name or file path to save to

                                   If you haven't already authenticated or your session has expired,
                                   you'll be asked to log in

                                   Example: spfile fetch https://your.sharepoint.com/path/foo.json
                                   Example: spfile fetch https://your.sharepoint.com/path/bar.pdf bar.pdf

    login <HOSTURL> .............. Authenticates with Sharepoint explicitly
                                   <HOSTURL> The Sharepoint host URL

                                   Example: spfile login https://your.sharepoint.com

    logout ....................... Invalidates your Sharepoint session explicitly

License
-------

The MIT License ([MIT](http://choosealicense.com/licenses/mit/))

Copyright (c) 2016 [Timegrip](http://timegrip.no)
