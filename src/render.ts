import { setData } from './data';
import { addListener, removeListener } from './events';
import { NodeDeclaration } from './defs';
import { createPlugins } from './plugins';

function walkTree(
    node: NodeDeclaration | string,
    accumulator: Element,
    iteratee: (
        node: NodeDeclaration | string,
        accumulator: Element,
        index: number,
        siblings: (NodeDeclaration | string)[]
    ) => Element,
    index = 0,
    siblings = [node]
) {
    const result = iteratee(node, accumulator, index, siblings);
    if (
        typeof node === 'object' &&
        node !== null &&
        Array.isArray(node.children)
    ) {
        if (nativeContainers.has(result)) {
            return;
        }
        node.children.forEach((c, i) => walkTree(c, result, iteratee, i, node.children));
    }
}

const nativeContainers = new WeakMap<Element, boolean>();
const didMountHandlers = new WeakMap<Element, (el: Element) => void>();
const didUpdateHandlers = new WeakMap<Element, (el: Element) => void>();
const willUnmountHandlers = new WeakMap<Element, (el: Element) => void>();
const lifecycleHandlers: { [event: string]: WeakMap<Element, (el: Element) => void> } = {
    'didmount': didMountHandlers,
    'didupdate': didUpdateHandlers,
    'willunmount': willUnmountHandlers
};

export const pluginsCreateElement = createPlugins<NodeDeclaration, Element>()
    .add((d) => document.createElement(d.tag));

export const pluginsMountElement = createPlugins<{ element: Element; parent: Element; next: Node; }, boolean>()
    .add(({ element, parent, next }) => {
        parent.insertBefore(element, next);
        return true;
    });

export const pluginsUnmountElement = createPlugins<{ element: Element; parent: Element; }, boolean>()
    .add(({ element, parent }) => {
        parent.removeChild(element);
        return true;
    });

export const pluginsSetAttribute = createPlugins<{ element: Element; attr: string; value: any; }, boolean>()
    .add(({ element, attr, value }) => {
        if (value == null) {
            element.removeAttribute(attr);
        } else {
            element.setAttribute(attr, String(value));
        }
        return true;
    })
    .add(({ element, attr, value }) => {
        if (attr.indexOf('on') === 0) {
            const event = attr.substring(2);
            if (typeof value === 'function') {
                addListener(element, event, value);
            } else {
                removeListener(element, event);
            }
            return true;
        }
        return null;
    })
    .add(({ element, attr, value }) => {
        if (attr === 'native' && value === true) {
            if (value === true) {
                nativeContainers.set(element, true);
            } else {
                nativeContainers.delete(element);
            }
            return true;
        }
        if (attr in lifecycleHandlers) {
            const handlers = lifecycleHandlers[attr];
            if (value) {
                handlers.set(element, value);
            } else {
                handlers.delete(element);
            }
            return true;
        }
        return null;
    })
    .add(({ element, attr, value }) => {
        if (attr === 'data') {
            setData(element, value);
            return true;
        }
        return null;
    });

const elementsAttrs = new WeakMap<Element, { [attr: string]: any }>();

export function getAttrs(element: Element) {
    return elementsAttrs.get(element) || null;
}

function createNode(d: NodeDeclaration) {
    const element = pluginsCreateElement.apply(d);
    const elementAttrs = {};
    elementsAttrs.set(element, elementAttrs);
    Object.keys(d.attrs).forEach((attr) => {
        const value = d.attrs[attr];
        if (value == null) {
            return;
        }
        pluginsSetAttribute.apply({ element, attr, value });
        elementAttrs[attr] = value;
    });
    return element;
}

function iterate(
    d: NodeDeclaration | string,
    parentNode: Element,
    index: number,
    siblings: (NodeDeclaration | string)[]
) {

    for (let i = parentNode.childNodes.length, n; i >= 0; i--) {
        n = parentNode.childNodes.item(i);
        if (n instanceof Text && !n.textContent.trim()) {
            parentNode.removeChild(n);
        }
    }

    if (typeof d === 'string') {
        if (index > 0) {
            // Todo: more than 1 text node
            throw new Error('Only one text node is possible.');
        }
        if (parentNode.textContent !== d) {
            parentNode.textContent = d;
        }
        return null;
    } else {
        d.attrs = d.attrs || {};
        d.children = d.children || [];
        const existing = parentNode.childNodes.item(index) as Element;
        let next: Node = null;
        if (!(
            existing &&
            existing instanceof Element &&
            existing.tagName.toLowerCase() === d.tag
        )) {
            // Create new node
            const node = createNode(d);
            if (existing) {
                // Remove existing node
                if (willUnmountHandlers.has(existing)) {
                    willUnmountHandlers.get(existing)(existing);
                }
                next = existing.nextSibling;
                pluginsUnmountElement.apply({ element: existing, parent: parentNode });
            }
            pluginsMountElement.apply({ element: node, parent: parentNode, next });
            if (didMountHandlers.has(node)) {
                didMountHandlers.get(node)(node);
            }
            return node;
        }

        // Synchronize attributes
        const attrNames = Object.keys(d.attrs);
        const existingAttrs = getAttrs(existing);
        const existingAttrNames = Object.keys(existingAttrs);
        existingAttrNames.forEach((key) => {
            if (!(key in d.attrs)) {
                pluginsSetAttribute.apply({ element: existing, attr: key, value: null });
                delete existingAttrs[key];
            }
        });
        attrNames.forEach((key) => {
            const value = d.attrs[key];
            if (existingAttrs[key] !== value) {
                pluginsSetAttribute.apply({ element: existing, attr: key, value });
                existingAttrs[key] = value;
            }
        });
        if (didUpdateHandlers.has(existing)) {
            didUpdateHandlers.get(existing)(existing);
        }

        // Remove overflown nodes
        if (nativeContainers.has(existing)) {
            // Children of nodes marked as native should not be removed
            return existing;
        }
        const childNodes = existing.childNodes;
        let child: Element;
        while (childNodes.length > d.children.length) {
            child = childNodes.item(childNodes.length - 1) as Element;
            if (willUnmountHandlers.has(child)) {
                willUnmountHandlers.get(child)(child);
            }
            pluginsUnmountElement.apply({ element: child, parent: existing });
        }

        return existing;
    }
}

export function render(target: Element, declaration: NodeDeclaration | string) {
    if (!(target instanceof Element)) {
        throw new Error('Wrong rendering target');
    }
    walkTree(declaration, target, iterate);
}
