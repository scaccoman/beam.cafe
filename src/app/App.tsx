import {Component, h} from 'preact';
import {DialogBox}    from './overlays/DialogBox';
import {UpdateScreen} from './overlays/UpdateScreen';
import {Toast}        from './overlays/Toast';
import {StatusBar}    from './StatusBar';
import {Tabs}         from './tabs/container/Tabs';
import styles         from './App.module.scss';

export class App extends Component {
    render() {
        return (
            <div className={styles.app}>
                {DialogBox.element}
                {Toast.element}
                <UpdateScreen/>
                <StatusBar/>
                <Tabs/>
            </div>
        );
    }
}
