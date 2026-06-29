Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "D:\PY\program\rabbit\small-rabbit-editor"
WshShell.Run "cmd /c " & chr(34) & "C:\Program Files\nodejs\node.exe" & chr(34) & " node_modules\electron\cli.js .", 0, False
