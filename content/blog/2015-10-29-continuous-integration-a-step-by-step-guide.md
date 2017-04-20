---
description: null
slug: "continuous-integration-step-step-guide"
date: "2012-03-05"
tags: null
published: true
title: "Continuous Integration - A Step by Step Guide"
author: "RobHardwick"
---

In the software development world, Continuous Integration (CI) is the process of continuously applying quality control to a piece of software in development. What this usually amounts to in practice is having automated systems that build, deploy and test your software each time a change is made. As software complexity increases, and more developers are added to the team, having these types of automated systems in place becomes essential to controlling the quality and cost of projects.

At Atchai, we have been using many of the components of CI (version control, automated build systems, testing frameworks) for years but only recently have we needed to put them all together into a single, coherent system.

## Our Setup

### Architecture

The system we’ve settled upon revolves around a few crucial pieces of software. Meet the team:

#### [Jenkins](http://jenkins-ci.org/)

The boss - Responsible for polling Git for changes, software builds and deployment, initiating the tests and providing reports.

#### [Fabric](http://fabfile.org/)

The glue - Executes build and deployment scripts remotely

#### [Selenium](http://seleniumhq.org/)

The perfectionist - Runs high-level, “black box” functional tests against the site such as logging in or submitting content

#### [Siege](http://www.joedog.org/siege-home/)

The sledgehammer - Tests site performance by initiating a large number of requests

### The Stack

To give you some context, here’s the software stack/tools we generally use for our projects (although alternatives to these should work just as well):

* Ubuntu
* Apache
* MySQL
* PHP
* Git
* Drupal / Drush

### A Commit (A Day In The Life)

![Untitled-2.jpg](/images/Untitled-2.jpg)

To give you an idea of how our system works day-to-day I’ll walk you through what happens with a single commit:

* Tarquin (our developer) commits a change to the master branch of the website he’s working on and pushes it to the git server
* Jenkins is polling the git server every minute and, noticing Tarquin’s commit, launches a new build process
* The build process starts with a Fabric script in the project’s root (available on github). This script is run (by Fabric) on the build server and:
  * Updates the working copy of the repository on the build server (or clones a new working copy if none exists)
  * Runs a Drupal install using Drush’s “site install” command
  * Runs any site-specific install commands such as enabling modules, migrating content, search indexing, etc
* After a successful build a series of functional tests are run by Selenium. These are run on the CI server and connect to the newly built site on the build server. For Tarquin, these tests consist of:
  * A user logging in
  * An admin user logging in and creating a blog post
  * A user navigating to a blog post, logging in and posting a comment
* After all functional tests have completed successfully a performance test is run by Siege. On Tarquin’s project the performance test consists of loading various key pages over 10 concurrent connections to the site. Reports on load averages, query usage, etc are determined using New Relic.
* An email report is sent to Tarquin informing him of any build or test failures

## Installation Instructions

Had enough of the theory? Let's go...

### Install Jenkins
* `sudo apt-get install jenkins fabric`
* `sudo apt-get install apache2`
* `sudo a2dissite default`
* `sudo a2enmod proxy proxy_http headers rewrite`
* `sudo htpasswd -c /etc/apache2/htpasswd username`
* `sudo nano /etc/apache2/sites-available/jenkins`

        <VirtualHost *:80>
            ServerName example.com
            DocumentRoot "/var/www"
    
        <Location />
           AuthType Basic
           AuthName "Restricted Files"
           AuthUserFile /etc/apache2/htpasswd
           Require valid-user
    
           RequestHeader   unset X-Forwarded-User
    
           RewriteEngine   On
           RewriteCond     %{LA-U:REMOTE_USER} (.+)
           RewriteRule     .* - [E=RU:%1]
           RequestHeader   set X-Forwarded-User %{RU}e
        </Location>
    
        ProxyPass         /     http://localhost:8080/
        ProxyPassReverse  /     http://localhost:8080/
        ProxyRequests     Off
    
        <Proxy http://localhost:8080/*>
           Order deny,allow
           Allow from all
        </Proxy>
    </VirtualHost>
* Navigate to the Jenkins web interface in a browser
* Install plugin "reverse-proxy-auth-plugin"
* Add a user through the web interface
* Turn on authentication
* Install plugin "Jenkins GIT plugin"
* `sudo -u jenkins ssh-keygen`
* Add the jenkins user's public key (`/var/lib/jenkins/.ssh/id_rsa.pub`) to your git server
* `sudo -u jenkins git clone git@example.git:/example.git /tmp/repo` (to add the git server's host key)
* `ssh remoteserver.com`
* `useradd jenkins`
* `sudo -u jenkins ssh-keygen`
* Add the jenkins user's public key (`/home/jenkins/.ssh/id_rsa.pub`) to your git server
* `sudo -u jenkins git clone git@example.git:/example.git /tmp/repo` (again, to add the git server's host key)

### Install Selenium

* `sudo apt-get install default-jre`
* Install plugin "Hudson Seleniumhq plugin" in Jenkins
* [Download selenium server standalone](http://seleniumhq.org/download/) to `/var/lib/jenkins/`
* `sudo apt-get install xvfb`
* `sudo nano /etc/init.d/xvfb`
        
        #!/bin/bash
        ### BEGIN INIT INFO
        # Provides:          Xvfb
        # Required-Start:    $remote_fs $syslog
        # Required-Stop:     $remote_fs $syslog
        # Default-Start:     2 3 4 5
        # Default-Stop:      0 1 6
        # Short-Description: Start daemon at boot time
        # Description:       Enable service provided by daemon.
        ### END INIT INFO
        
        if [ -z "$1" ]; then
            echo "`basename $0` {start|stop}"
            exit
        fi
        
        case "$1" in
            start)
                /usr/bin/Xvfb :99 -ac -screen 0 1024x768x8 &amp;
                ;;
        
            stop)
                killall Xvfb
                ;;
        esac
* `sudo chmod 755 /etc/init.d/xvfb`
* `sudo /etc/init.d/xvfb start` (you can ignore any font errors)
* `sudo update-rc.d xvfb defaults 10`
* `sudo apt-get install firefox`
* Add an "Execute shell" build step to your Jenkins job:
`DISPLAY=":99" java -jar $JENKINS_HOME/selenium-server-standalone-2.19.0.jar -browserSessionReuse -htmlSuite *firefox http://example.com $WORKSPACE/test/TestSuite.html $WORKSPACE/seleniumhq/result.html`

### Install Siege
* `sudo apt-get install siege`
* Add an "Execute shell" build step to your Jenkins job:
`siege -l $WORKSPACE/siege.log -c 5 -b -t30s http://example.com`

## What's Next?

![Untitled-23.jpg](/images/Untitled-23.jpg)

Everything is now ready for your CI system except for the Fabric scripts to actually build the project. The Fabric script for each project will necessarily be different but if you'd like to see an example, especially if you use Drupal, have a look at our [CI project on github](https://github.com/atchai/atchai-ci) which has helper class for installing Drupal using Drush and an example usage of it.

Once you have your system running I recommend looking through the Jenkins plugins for anything that might be useful to your setup. The power (and complexity) of Jenkins comes through its plugins so it's worth getting acquainted.