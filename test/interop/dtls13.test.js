/*
 *  Copyright (c) 2022 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
const {buildDriver} = require('../webdriver');
const {PeerConnection, MediaDevices} = require('../webrtcclient');
const steps = require('../steps');

// browser,version,DTLS version,forcetrialstring
const browserA = process.env.BROWSER_A || 'chrome%stable%notused%';
const browserB = process.env.BROWSER_B || 'chrome%stable%FEFD%';

function makeOptions(browser) {
  return {
    version: browser.split(',')[1],
    browserLogging: true,
    chromeFlags: [
      '--force-fieldtrials=' + browser.split(',')[3],
    ]
  };
}

describe(`${browserA} => ${browserB}`, function() {
  let drivers;
  let clients;
  beforeAll(async () => {
    drivers = [
      await buildDriver(browserA.split(',')[0], makeOptions(browserA)),
      await buildDriver(browserB.split(',')[0], makeOptions(browserB)),
    ];
    clients = drivers.map(driver => {
      return {
        connection: new PeerConnection(driver),
        mediaDevices: new MediaDevices(driver),
      };
    });
  });
  afterAll(async () => {
    await drivers.map(driver => driver.close());
  });

  it('establishes a connection', async () => {
    await Promise.all(drivers); // timeouts in before(Each)?
    await steps.step(drivers, (d) => d.get('https://webrtc.github.io/samples/emptypage.html'), 'Empty page loaded');
    await steps.step(clients, (client) => client.connection.create(), 'Created RTCPeerConnection');
    await steps.step(clients, async (client) => {
      const stream = await client.mediaDevices.getUserMedia({audio: true, video: true});
      return Promise.all(stream.getTracks().map(async track => {
        return client.connection.addTrack(track, stream);
      }));
    }, 'Acquired and added audio/video stream');
    const offerWithCandidates = await clients[0].connection.setLocalDescription();
    await clients[1].connection.setRemoteDescription(offerWithCandidates);
    const answerWithCandidates = await clients[1].connection.setLocalDescription();
    await clients[0].connection.setRemoteDescription(answerWithCandidates);

    await steps.step(drivers, (d) => steps.waitNVideosExist(d, 1), 'Video elements exist');
    await steps.step(drivers, steps.waitAllVideosHaveEnoughData, 'Video elements have enough data');

    // Take stats from the second connection.
    const stats = await clients[1].connection.getStats();
    const transportStats = [...stats.values()].filter(({type}) => type === 'transport');
    expect(transportStats.length).toBe(1);
    expect(transportStats[0].tlsVersion).toBe(browserB.split(',')[2]); // FEFD => DTLS 1.2, FEFC => DTLS 1.3
  }, 30000);
}, 90000);
