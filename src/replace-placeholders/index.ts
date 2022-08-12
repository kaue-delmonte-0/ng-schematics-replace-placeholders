import { Path } from '@angular-devkit/core';
import { camelize, capitalize, classify, dasherize, underscore } from '@angular-devkit/core/src/utils/strings';
import { chain, DirEntry, FileEntry, move, Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { RunSchematicTask } from '@angular-devkit/schematics/tasks'
const formatters = [
  camelize,
  capitalize,
  classify,
  dasherize,
  underscore
]

const placeholder = 'ng-placeholder';

const placeholders = getPlaceholders(placeholder);

const ignore = (str: string) => {
  return [
    !str.startsWith('.'),
    !str.match('node_modules')
  ].every(v => v);
}

export function main(options: any): Rule {
  return (tree: Tree, _context: SchematicContext) => {
    const contentTask = _context.addTask(new RunSchematicTask('replace-content-placeholders', options));
    const filenameTask = _context.addTask(new RunSchematicTask('replace-filename-placeholders', options), [contentTask]);
    const dirnameTask = _context.addTask(new RunSchematicTask('replace-dirname-placeholders', options), [filenameTask]);
    _context.addTask(new RunSchematicTask('remove-empty-directories', options), [dirnameTask]);
    return tree;
  }
}

export function replaceDirnamePlaceholders({ name }: any): Rule {
  return (tree: Tree) => {

    const dirpaths = findPlaceholderInTree(tree.root, 'subdirs', ignore, placeholders);

    console.log('dirpaths', dirpaths);

    const rules = dirpaths.map(dirpath => {
      const to = replacePlaceholder(dirpath, name);
      console.info(`renaming ${dirpath} -> ${to}`);
      return move(dirpath, to);
    })

    return chain(rules);

  }
}

export function replaceFilenamePlaceholders({ name }: any): Rule {
  return (tree: Tree) => {

    const filepaths = findPlaceholderInTree(tree.root, 'subfiles', ignore, placeholders);

    console.log('filepaths', filepaths);

    filepaths.forEach(filepath => {
      const to = replacePlaceholder(filepath, name, 'last');
      console.info(`renaming ${filepath} -> ${to}`);
      tree.rename(
        filepath,
        to
      );
    });

    return tree;

  }
}

export function replaceContentPlaceholders({ name }: any): Rule {
  return (tree: Tree) => {

    tree.visit((path) => {
      if (!tree.exists(path)) return;
      const buffer = tree.read(path);
      if (!buffer) return;
      tree.overwrite(
        path,
        replacePlaceholder(buffer.toString(), name, 'all')
      );
    });

    return tree;

  };
}

export function removeEmptyDirectories(): Rule {
  return (tree: Tree) => {
    findPlaceholderInTree(tree.root, 'subdirs', ignore, placeholders).forEach(directory => {
      console.warn(`deleting ${directory}`);
      tree.delete(directory);
    });

    return tree;
  }
}

function findPlaceholderInTree(
  directory: DirEntry,
  type: 'subdirs' | 'subfiles',
  ignore: (str: string) => Boolean,
  placeholders: string[]
): Path[] {
  return [
    ...directory[type].filter(ignore).filter(path => placeholders.some(placeholder => path.includes(placeholder))).map(path => (directory[type === 'subdirs' ? 'dir' : 'file'](path) as FileEntry).path),
    ...directory.subdirs.filter(ignore).reduce((files, dir) => [...files, ...findPlaceholderInTree(directory.dir(dir), type, ignore, placeholders)], [])
  ]
}

function replacePlaceholder(
  target: string,
  value: string,
  occurrence?: 'last' | 'all') {
  return formatters.reduce(
    (str, formatter) => {
      return str.replace(
        new RegExp(
          occurrence === 'last' ? '(' + formatter(placeholder) + ')(?!.*\\1)' : formatter(placeholder),
          occurrence === 'all' ? 'g' : ''
        ),
        formatter(value)
      )
    }, target);
}

function getPlaceholders(placeholder: string) {
  return formatters.map(formatter => formatter(placeholder))
}