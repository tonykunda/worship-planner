(function() {
  'use strict';

  angular
    .module('frontend')
    .controller('MainController', MainController);

  /** @ngInject */
  function MainController($firebaseArray, $filter, pdfMake, firebase, $firebaseAuth, $log, $timeout) {
    var vm = this;

    vm.orderKey = "order"

    var auth = $firebaseAuth();

    vm.clearSet = function() {
      angular.forEach(vm.songs, function(song) {
        song.order = null
        song.selected = false
        vm.songs.$save(song)
      })
      vm.newSet()
    }

    vm.getDataFromFirebase = function() {
      var songsRef = firebase.database().ref().child("songs");
      vm.songs = $firebaseArray(songsRef)
      var setsRef = firebase.database().ref().child("sets");
      vm.sets = $firebaseArray(setsRef)
    }

    if (!auth.$getAuth()) {
      // login with Facebook
      auth.$signInWithPopup("google").then(function() {
        vm.getDataFromFirebase()
      }).catch(function() {
        $log.log("Not Logged In")
      });
    } else {
      vm.getDataFromFirebase()
    }

    pdfMake.fonts = {
      Roboto: {
        normal: 'Roboto-Regular.ttf',
        bold: 'Roboto-Medium.ttf',
        italics: 'Roboto-Italic.ttf',
        bolditalics: 'Roboto-MediumItalic.ttf'
      },
      Consolas: {
        normal: 'Consolas.ttf'
      }
    };

    vm.keys = ["A", "A#", "B", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#"]
    vm.tempos = ["Fast", "Medium", "Medium Slow", "Slow"]
    vm.placements = ["Open", "Middle", "End", "Hymn"]

    vm.newSong = function(){
      vm.selectedSong = {
        id:null,
        title:null,
        author:null,
        lyrics: null,
        chords: null,
        key:null,
        tempo:null,
        placement:null,
        selected:false,
        order:null
      }
    }

    vm.newSong()

    vm.firstLine = function(lyrics) {
      return lyrics.split("\n")[0]
    }

    vm.setSelectedSong = function(song) {
      vm.unchangedSong = angular.copy(song)
      vm.selectedSong = song
    }

    vm.songChanged = function() {
      return !angular.equals(vm.unchangedSong, vm.selectedSong)
    }

    vm.copyLyrics = function() {
      vm.selectedSong.chords = vm.selectedSong.lyrics
    }

    vm.saveSong = function(song) {
      if (song.$id) {
        vm.unchangedSong = angular.copy(song)
        vm.songs.$save(song)
      } else {
        vm.songs.$add(vm.selectedSong)
        vm.newSong()
      }
    }

    vm.removeSong = function(song) {
      vm.songs.$remove(song)
      vm.selectedSong = null
    }


    vm.selectedSongsChords = function() {
      var songs = []
      angular.forEach($filter('orderBy')(vm.songs, 'order', false), function(song) {
        if (song.selected) {
          songs.push([
            {
              text: song.title,
              style: 'header'
            },
            song.chords
          ]
        )
        }
      })
      return songs
    }

    vm.selectedSongsLyrics = function() {
      var songs = []
      angular.forEach($filter('orderBy')(vm.songs, 'order', false), function(song) {
        if (song.selected) {
          songs.push([
            {
              text: song.title,
              style: 'header'
            },
            song.lyrics
          ]
        )
        }
      })
      return songs
    }

    vm.selectedSongsCues = function() {
      var songs = []
      angular.forEach($filter('orderBy')(vm.songs, 'order', false), function(song) {
        if (song.selected) {
          var songCues = ""
          angular.forEach(song.lyrics.split("\n\n"), function(verse) {
            songCues = songCues + verse.split("\n")[0] + "\n\n"
          })
          songs.push([
            {
              text: song.title,
              style: 'header'
            },
            songCues
          ]
        )
        }
      })
      return songs
    }

    function getLength(thing) {
      return thing.split("\n").length
    }

    function makeColumns(songs) {
      var maxLines = 55
      var results = []
      var cols = []
      var tempCol = ""
      angular.forEach(songs, function(song) {
        if (cols.length == 0) {
          tempCol = song[1]
          cols.push([{
            text: song[0],
            style: 'header'
          },
          song[1]
        ])
        } else if (getLength(tempCol) + getLength(song[1]) < maxLines) {
          tempCol = tempCol + song[1]
          cols[cols.length - 1].push({
            text: song[0],
            style: 'header'
          })
          cols[cols.length - 1].push(song[1])
        } else {
          tempCol = song[1]
          cols.push([{
            text: song[0],
            style: 'header'
          },
          song[1]
        ])
        }

      })

      var nextSongNeeded = 0
      angular.forEach(cols, function(col, key) {
        if (nextSongNeeded == key) {
          results.push({columns:[cols[key],cols[key+1]? cols[key+1] : {}], pageBreak: key == cols.length - 1 ? false : 'after'})
          nextSongNeeded = key + 2
        }
      })

      return results
    }

    vm.printChords = function() {
      var docDefinition = {
        content: makeColumns(vm.selectedSongsChords()),
        styles: {
          header: {
            font: 'Roboto',
            fontSize: 12,
            bold: true,
            margin: [0,10]
          }
        },
        defaultStyle: {
          font: 'Consolas',
          fontSize: 10
        }
      };
      pdfMake.createPdf(docDefinition).open();
    }

    vm.printLyrics = function() {
      var docDefinition = {
        content: makeColumns(vm.selectedSongsLyrics()),
        styles: {
          header: {
            font: 'Roboto',
            fontSize: 12,
            bold: true,
            margin: [0,10]
          }
        },
        defaultStyle: {
          font: 'Roboto',
          fontSize: 10
        }
      };
      pdfMake.createPdf(docDefinition).open();
    }

    vm.printCueSheet = function() {
      var docDefinition = {
        content: makeColumns(vm.selectedSongsCues()),
        styles: {
          header: {
            font: 'Roboto',
            fontSize: 12,
            bold: true,
            margin: [0,10]
          }
        },
        defaultStyle: {
          font: 'Roboto',
          fontSize: 10
        }
      };
      pdfMake.createPdf(docDefinition).open();
    }

    // sets
    vm.newSet = function() {
      vm.selectedSet = {
        id: null,
        name: null,
        songs: []
      }
    }

    vm.newSet()

    vm.saveSet = function(set) {
      if (!set.$id) {
        vm.sets.$add(set)
      } else {
        vm.sets.$save(set)
      }
    }

    vm.deleteSet = function(set) {
      vm.sets.$remove(set)
    }

    vm.selectSet = function(set) {
      vm.clearSet()
      vm.selectedSet = set
      angular.forEach(set.songs, function(setSong) {
        angular.forEach(vm.songs, function(song) {
          if (setSong.id == song.$id) {
            song.selected = true
            song.order = setSong.order
            vm.songs.$save(song)
          }
        })
      })
    }

    vm.selectSong = function(song) {
      if (song.selected) {
        vm.selectedSet.songs.push({id:song.$id, order:song.order})
      } else {
        angular.forEach(vm.selectedSet.songs, function(songFound, key) {
          song.order = null
          if (song.$id == songFound.id) {
            vm.selectedSet.songs.splice(key, 1)
          }
        })
      }
      vm.unchangedSong = angular.copy(song)
      vm.songs.$save(song)
    }

    vm.orderSong = function(song) {
      if (song.selected) {
        angular.forEach(vm.selectedSet.songs, function(songFound, key) {
          if (song.$id == songFound.id) {
            vm.selectedSet.songs.splice(key, 1, {id:song.$id, order:song.order})
          }
        })
      }
      vm.unchangedSong = angular.copy(song)
      vm.songs.$save(song)
    }

  }
})();
