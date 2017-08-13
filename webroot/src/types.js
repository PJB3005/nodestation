/*
    Node Station - A Space Station 13 clone
    Copyright (C) 2017  Ryan Hanson

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/


// This file will be used in both the client and the server as a dictionary of
// game objects

function buildTypeSet(typeSet) {
   typeSet.addItemType('idCard', function(item) {
      item.isWearable = false;
      item.render = {
         icon: {
            image: 'items',
            index: 1
         }
      };
   });
   typeSet.addItemType('shirt', function(item) {
      item.isWearable = true;
      item.render = {
         icon: {
            image: 'items',
            index: 0
         }
      };
   });
}


if(typeof module !== 'undefined') {

   module.exports = {
      buildTypeSet: buildTypeSet
   };
}

