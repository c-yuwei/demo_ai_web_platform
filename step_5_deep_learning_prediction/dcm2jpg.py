import pydicom as dicom
import os
import cv2
import sys, getopt

def dcm2jpg(inputFileName, size):
    width = 224
    height = 224
    dim = (width, height)
    extension = os.path.splitext(inputFileName)
    if extension[1] == '.dcm':
        ds = dicom.dcmread(os.path.join(inputFileName))
        inputFileName = inputFileName.replace('.dcm', '.jpg')
        pixel_array_numpy = ds.pixel_array
        cv2.imwrite(os.path.join(inputFileName), pixel_array_numpy)
    img = cv2.imread(os.path.join(inputFileName), cv2.IMREAD_UNCHANGED)
    resized = cv2.resize(img, dim, interpolation = cv2.INTER_AREA)
    cv2.imwrite(os.path.join(inputFileName), resized) 
    outputFileName = inputFileName.rsplit('/', 1)[-1]
    print(outputFileName)

fullCmdArgs = sys.argv
argList = fullCmdArgs[1:]
unixOptions = "f:rs:"
gunOptions = ["filename=", "resize2="]

try:
    arguments, values = getopt.getopt(argList, unixOptions,gunOptions)
except getopt.error as err:
    print (str(err))
    sys.exit(2)

inputFile = "./uploaded_files/0a5a6574-d94d-441f-afe4-115ba66b322e.jpg"
resize = [224,224]

for currentArg, currentVal in arguments:
    if currentArg in ("-f","--inputFile"):
        inputFile = currentVal
    elif currentArg in ("-rs","--resize2"):
        resize = currentVal
dcm2jpg(inputFile,resize)