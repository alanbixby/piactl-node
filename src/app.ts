import hasbin from 'hasbin'
import { exec, execSync, spawn } from 'child_process'
import EventEmitter, { once } from 'events'
import { PIAConnectionState, PIAOptions, PIARegion } from '.'

class PIAClient {
  connectionState: PIAConnectionState
  currentRegion: PIARegion
  connectionEvent

  constructor(options?: PIAOptions) {
    if (!hasbin.sync('piactl')) {
      throw new Error('piactl could not be found on path')
    }

    this.connectionState = this.getConnectionState()
    this.currentRegion = this.getRegion()
    this.connectionEvent = new EventEmitter()
    spawn('piactl', ['monitor', 'connectionstate']).stdout.on(
      'data',
      (state: PIAConnectionState) => {
        this.connectionState = state.toString().trim() as PIAConnectionState
        this.connectionEvent.emit(this.connectionState)
        console.log('-', this.connectionState)
      }
    )
  }

  async connect(newRegion?: PIARegion) {
    if (this.connectionState === 'Connected') {
      console.log('ALREADY CONNECTED')
      return
    }
    if (newRegion && newRegion !== this.currentRegion) {
      await exec(`piactl set region ${newRegion}`)
    }
    await exec('piactl connect')
    await once(this.connectionEvent, 'Connected')
  }

  async disconnect() {
    if (this.connectionState === 'Disconnected') {
      console.log('ALREADY DISCONNECTED')
      return
    }
    await exec('piactl disconnect')
    await once(this.connectionEvent, 'Disconnected')
  }

  async reconnect() {
    console.log(`connectionState: '${this.connectionState}'`)
    console.log('[!] starting to disconnect')
    await this.disconnect()
    console.log('[!] starting to reconnect')
    await this.connect()
    console.log('[!] reconnected, resume operations')
  }

  getConnectionState(): PIAConnectionState {
    return execSync('piactl get connectionstate')
      .toString()
      .trim() as PIAConnectionState
  }

  getRegion(): PIARegion {
    return execSync('piactl get region').toString().trim() as PIARegion
  }
}

const test = new PIAClient()
await test.reconnect()
await test.disconnect
