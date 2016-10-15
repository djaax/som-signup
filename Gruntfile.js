module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    /*
    webfont: {
      icons: {
        src: 'public/style/icons/*.svg',
        dest: 'public/style/fonts/',
        destCss: 'public/style/less/',
        syntax: 'bem',
        options: {
          font: 'cpx',
          template: 'public/style/fonts/cpx_template.css',
          htmlDemo: false,
          stylesheet: 'css'
        }
      }
    },
    */

    /*
    concat: {
      email: {
        files: {
          //'templates/email/raw/contact.tpl':             ['templates/email/head.tpl', 'templates/email/contact.tpl',            'templates/email/footer.tpl'],
          'templates/email/raw/forgot.tpl':              ['templates/email/head.tpl', 'templates/email/forgot.tpl',             'templates/email/footer.tpl'],
          'templates/email/raw/order.tpl':               ['templates/email/head.tpl', 'templates/email/order.tpl',              'templates/email/footer.tpl'],
          'templates/email/raw/subscription.tpl':        ['templates/email/head.tpl', 'templates/email/subscription.tpl',       'templates/email/footer.tpl'],
          'templates/email/raw/registry.tpl':            ['templates/email/head.tpl', 'templates/email/registry.tpl',           'templates/email/footer.tpl'],
          'templates/email/raw/download_available.tpl':  ['templates/email/head.tpl', 'templates/email/download_available.tpl', 'templates/email/footer.tpl'],
          'templates/email/raw/replace_email.tpl':       ['templates/email/head.tpl', 'templates/email/replace_email.tpl',      'templates/email/footer.tpl'],
          'templates/email/raw/subscribe.tpl':           ['templates/email/head.tpl', 'templates/email/subscribe.tpl',          'templates/email/footer.tpl']
        },
      }
      */

      /*
      scripts: {
        files: {
          'public/build/angular-base.js': ['public/libs/angular/angular.min.js', 'public/libs/angular-animate/angular-animate.min.js', 'public/libs/angular-ui-router/release/angular-ui-router.js', 'public/libs/angular-ui-utils/ui-utils.js', 'public/libs/angular-sanitize/angular-sanitize.js'],
          'public/build/angular-extension.js': ['public/libs/ng-file-upload/angular-file-upload-shim.js', 'public/libs/ng-file-upload/angular-file-upload.js', 'public/libs/angular-translate/angular-translate.min.js', 'public/libs/angular-translate-loader-static-files/angular-translate-loader-static-files.min.js', 'public/libs/angular-bootstrap/ui-bootstrap.js', 'public/libs/angular-bootstrap/ui-bootstrap-tpls.js', 'https://code.angularjs.org/1.2.5/i18n/angular-locale_de.js'],
          'public/build/libs.js': ['public/libs/underscore/underscore.js', 'public/libs/async/lib/async.js', 'public/libs/moment/moment.js', 'public/libs/spin.js/spin.js', 'public/libs/sweetalert/lib/sweet-alert.min.js'],
          'public/build/custom.js': ['public/custom-libs/dragable.js', 'public/custom-libs/infiniteScroll.js', 'public/custom-libs/uservoice.js'],
          'public/build/app.js': ['public/js/*.js']
        }
      }
      */
    //},

    less: {
      /*
      email: {
        options: {
          compress: false,
          paths: ['public']
        },
        files: {
          'public/style/css/email.css': 'public/style/less/email.less'
        }
      },
      */
      main: {
        options: {
          compress: false,
          yuicompress: true,
          optimization: 2,
          sourceMap: true,
          paths: ['public']
          //sourceMappingURL: 'public/style/less/'
        },
        files: {
          'public/build/css/style.css': 'public/style/less/style.less'
        }
      }
    },
    watch: {
      styles: {
        // Which files to watch (all .less files recursively in the less directory)
        files: ['public/style/less/**/*.less'],
        tasks: ['less.style'],
        options: {
          spawn: false
        }
      }
    },
    imagemin: {
      options: {
        optimizationLevel: 2
      },
      files: [{
        expand: true,
        cwd: 'public/style/img',
        src: ['**/*.{png,jpg,gif}'],
        dest: 'public/style/img/min/'
      }]
    },
    /*
    emailBuilder: {
      email: {
        files: {
          //'templates/email/composed/contact.tpl':             'templates/email/raw/contact.tpl',
          'templates/email/composed/forgot.tpl':              'templates/email/raw/forgot.tpl',
          'templates/email/composed/order.tpl':               'templates/email/raw/order.tpl',
          'templates/email/composed/subscription.tpl':        'templates/email/raw/subscription.tpl',
          'templates/email/composed/registry.tpl':            'templates/email/raw/registry.tpl',
          'templates/email/composed/download_available.tpl':  'templates/email/raw/download_available.tpl',
          'templates/email/composed/replace_email.tpl':       'templates/email/raw/replace_email.tpl',
          //'templates/email/composed/subscribe.tpl':           'templates/email/raw/subscribe.tpl'
        }
      }
    },
    */
    ngconstant: {
      options: {
        name: 'app.config',
        dest: 'public/js/config.js',
        space: '  ',
        wrap: '"use strict";\n\n {%= __ngModule %}'
      },
      dev: {
        constants: {
          ENV: 'development',
          defaultPath: 'sold-out'
        }
      },
      prod: {
        constants: {
          ENV: 'production',
          defaultPath: 'sold-out'
        }
      }
    },


    // https://stackoverflow.com/questions/21969422/grunt-plugin-for-assets-versioning
    filerev: {
      options: {
        encoding: 'utf8',
        algorithm: 'md5',
        length: 8
      },
      app: {
        files: [{
          src: [
            'public/build/css/*.css',
            'public/build/js/*.js'
          ]
        }]
      }
    },

    useminPrepare: {
        html: 'public/start.html',
        options: {
          dest: 'public',
          flow: {
            steps: {
              'js': ['concat', 'uglifyjs'],
              'css': ['concat']
            },
            post: {}
          }
        }
    },

    usemin: {
      html: ['public/start.html'],
      options: {
        dirs: ['public'],
        assetsDirs: ['public']
      }
    },

    copy: {
      start: {
        src: 'templates/app.html',
        dest: 'public/start.html'
      }
    },

    clean: ['public/build'],

    ngAnnotate: {
      dist: {
        files: [{
          expand: true,
          cwd: '.tmp/concat/build/js',
          src: '*.js',
          dest: '.tmp/concat/build/js'
        }]
      }
    },

    dev_prod_switch: {
      options: {
        // Can be ran as `grunt --env=dev` or ``grunt --env=prod``
        environment: grunt.option('env') || 'dev', // 'prod' or 'dev'
        env_char: '#',
        env_block_dev: 'env:dev',
        env_block_prod: 'env:prod'
      },
      all: {
        files: {
          'public/start.html': 'public/start.html'
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-webfont');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-imagemin');
  grunt.loadNpmTasks('grunt-email-builder');
  grunt.loadNpmTasks('grunt-ng-constant');
  grunt.loadNpmTasks('grunt-filerev');
  grunt.loadNpmTasks('grunt-usemin');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-ng-annotate');
  grunt.loadNpmTasks('grunt-dev-prod-switch');

  // grunt build --env=prod; pm2 restart app; pm2 logs
  var env = grunt.option('env') || 'dev';
  grunt.registerTask('build', ['clean', 'copy:start', 'less:main', 'ngconstant:'+env, 'useminPrepare', 'concat:generated', 'ngAnnotate', 'uglify', 'filerev:app', 'usemin', 'dev_prod_switch']);
  grunt.registerTask('local', ['copy:start', 'ngconstant:dev', 'dev_prod_switch']);
  //grunt.registerTask('dev', ['imagemin', 'less:dev', 'ngconstant:development']);
  //grunt.registerTask('sandbox', ['ngconstant:sandbox']);
  //grunt.registerTask('local', ['ngconstant:local']);

  //grunt.registerTask('buildStart', ['copy:startHead', 'copy:startJs', 'less:start', 'filerev:start', 'usemin']);
};



