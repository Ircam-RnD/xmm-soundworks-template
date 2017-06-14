# xmm-soundworks-template

#### installation

If you don't already have Node.js installed, install the LTS version (>= 6.9.1).  
Download or clone this repository.  
From the terminal, `cd` into this folder, then type `npm install`.  
Once all the dependencies are installed, type `npm run watch`.  

#### about

This project is based on the [soundworks-template](https://github.com/collective-soundworks/soundworks-template).
It is a starting point for the creation of soundworks based projects that use gesture recognition.
The gesture recognition is performed by the [XMM](https://github.com/Ircam-RnD/xmm) library (more specifically
by the [xmm-node](https://github.com/Ircam-RnD/xmm-node) Node.js addon server-side, and by the
[xmm-client](https://github.com/Ircam-RnD/xmm-client) JavaScript library client-side).

###### designer

It features a special page, designer, which provides a simple interface allowing to record gestures
(streams of devicemotion data received from the smartphone's sensors) and train a model in real-time.
A visualization and a sonification of the results help the (human) gesture designer during the training process.
On each operation, the training set used to train the model, the model configuration, and the model itself
are updated in real-time, serialized and saved locally as json files for later reuse.

###### template

The real template (the main page) shows a simple way of reusing the statistical models trained in the designer page.
It includes the same sonification system as in the designer page to show a simple audio example, and allows to send the
classification results as an OpenSoundControl stream.
A Max and a pure-data patches show basic examples of how to use these OSC streams.

#### getting started

When you start with the designer, it first takes you to a login page.
The login you choose will be used as the prefix of your training set and your model's filenames.
Once you're logged in, you are taken to the main designer page.
There, you can notice a dropdown menu that lets you select a label.
Below, the **REC** button allows you to record streams of data.
The **SEND** button adds the latest recording to the training set, labelled with the currently
selected label.
If something went wrong with recordings of a certain label, it is possible to delete all the data
related to this label in the training set and in the model with the **CLEAR LABEL** button.
It is also possible to clear everything with the **CLEAR MODEL** button.  
  
Clicking on the nav icon in the grey bar at the top of the window opens the model configuration settings panel.
By default the model trained by the server is a simple GMM (Gaussian Mixture Model) with one gaussian.
You can tweak the model configuration settings to improve the gesture recognition accuracy.
When closing this panel, the model configuration settings will be saved and the model
will be immediately trained with the new settings. At this moment you should notice
a (positive or negative) change in the recognition accuracy.  
  
The **Enable sounds** button activates the audio players that sonify the classification results.
Each label is associated with a sound file.
One can change the labels and associated sounds in the "src/client/shared/config.js" file.

#### credits :

This project is developed by the [ISMM](http://ismm.ircam.fr/) team at IRCAM,
within the context of the [RAPID-MIX](http://rapidmix.goldsmithsdigital.com/)
project, funded by the European Union’s Horizon 2020 research and innovation programme.  
