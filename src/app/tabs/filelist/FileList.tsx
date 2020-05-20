import {DialogBox}             from '@overlays/DialogBox';
import {ListedFile}            from '@state/models/ListedFile';
import {observer}              from 'mobx-react';
import {Component, h}          from 'preact';
import {files, uploads}        from '@state/index';
import {fuzzyStringSimilarity} from '@utils/fuzzy-string-similarity';
import {bind}                  from '@utils/preact-utils';
import {isMobile}              from '../../browserenv';
import {SearchBar}             from '@components/SearchBar';
import {DropZone}              from './DropZone';
import {FileItem}              from './FileItem';
import styles                  from './FileList.module.scss';

export type SortKey = 'index' | 'name' | 'size';

type State = {
    searchTerm: null | string;
    sortKey: SortKey;
    toggleSortKey: boolean;
};

@observer
export class FileList extends Component<{}, State> {
    readonly state = {
        searchTerm: null,
        sortKey: 'index' as SortKey,
        toggleSortKey: false
    };

    get sortedElements() {
        const {searchTerm, sortKey, toggleSortKey} = this.state as State;
        const sortedList = [...files.listedFiles];

        if (searchTerm) {

            // Sort files and cache similarities
            const matches: Map<string, number> = new Map();
            sortedList.sort((a, b) => {
                const an = a.file.name;
                const bn = b.file.name;

                let sa = matches.get(an);
                if (sa === undefined) {
                    sa = fuzzyStringSimilarity(an, searchTerm);
                    matches.set(an, sa);
                }

                let sb = matches.get(bn);
                if (sb === undefined) {
                    sb = fuzzyStringSimilarity(bn, searchTerm);
                    matches.set(bn, sb);
                }

                return sb - sa;
            });
        } else {
            sortedList.sort((a, b) => {
                if (toggleSortKey) {
                    [a, b] = [b, a];
                }

                switch (sortKey) {
                    case 'index':
                        return a.index > b.index ? 1 : -1;
                    case 'name':
                        return a.file.name.localeCompare(b.file.name);
                    case 'size':
                        return a.file.size > b.file.size ? 1 : -1;
                }
            });
        }

        return sortedList;
    }

    @bind
    chooseFiles(): void {
        files.openDialog();
    }

    @bind
    sortBy(key: SortKey) {
        return () => {
            const {sortKey, toggleSortKey} = this.state;

            this.setState({
                toggleSortKey: sortKey === key ? !toggleSortKey : toggleSortKey,
                sortKey: key
            });
        };
    }

    @bind
    updateSearchTerm(searchTerm: string | null) {
        this.setState({searchTerm});
    }

    @bind
    removeSelectedFiles() {
        const {selectedItems} = files;

        const relatedUploads = uploads.listedUploads.filter(
            v => v.simpleState !== 'done' && selectedItems.includes(v.listedFile)
        ).length;

        const remove = () => {
            for (const item of selectedItems) {
                if (item.id) {
                    files.removeFile(item.id);
                }
            }
        };

        // Tell the user that uploads are about to get cancelled
        if (relatedUploads > 0) {
            DialogBox.instance.open({
                icon: 'exclamation-mark',
                title: 'Uh Oh! Are you sure about that?',
                description: relatedUploads > 1 ?
                    `There are currently ${relatedUploads} uploads related to the selected files. Continue?` :
                    'One of the files selected is currently being uploaded. Continue?',
                buttons: [
                    {
                        type: 'success',
                        text: 'Keep File'
                    },
                    {
                        type: 'error',
                        text: 'Remove'
                    }
                ]
            }).then(value => value === 1 && remove());
        } else {
            remove();
        }
    }

    selectItem(item: ListedFile) {

        // TODO: Range selection?
        files.toggleSelect(item);
    }

    render() {
        const {searchTerm} = this.state as State;
        const {listedFiles, selectedAmount} = files;
        const indexPadding = Math.max(String(listedFiles.length).length, 2);

        // TODO: Infinity scrolling? It gets really slow with ~200 items

        return (
            <div className={styles.fileList}>
                <DropZone/>
                <SearchBar onUpdate={this.updateSearchTerm}
                           value={searchTerm}/>

                <div className={styles.header}>
                    {!isMobile && <p className={styles.checkboxPlaceholder}/>}

                    <p>
                        <span onClick={this.sortBy('index')}>
                            <bc-tooltip content={'Sort By Index'}/>#
                        </span>
                    </p>

                    <p>
                        <span onClick={this.sortBy('name')}>
                            <bc-tooltip content={'Sort By Filename'}/>Filename
                        </span>
                    </p>

                    <p className={styles.alignRight}>
                        <span onClick={this.sortBy('size')}>
                            <bc-tooltip content={'Sort By File Size'}/>File Size
                        </span>
                    </p>

                    {isMobile ? (
                        <p className={styles.alignCenter}/>
                    ) : (
                        <p className={styles.alignCenter}>Actions</p>
                    )}
                </div>

                <div className={styles.list}>
                    {this.sortedElements.map(value =>
                        <FileItem key={value.index}
                                  item={value}
                                  selected={files.isSelected(value)}
                                  onSelect={this.selectItem}
                                  label={String(value.index + 1).padStart(indexPadding, '0')}/>
                    )}
                </div>

                <div className={styles.actionBar}>
                    <button onClick={this.chooseFiles}>
                        <bc-icon name="plus"/>
                        <span>Add Files</span>
                    </button>

                    {!isMobile && selectedAmount ?
                        <button onClick={this.removeSelectedFiles}>
                            <bc-icon name="trash"/>
                            <span>Remove {selectedAmount > 1 ? `${selectedAmount} files` : 'one file'}</span>
                        </button> : ''
                    }
                </div>
            </div>
        );
    }
}
