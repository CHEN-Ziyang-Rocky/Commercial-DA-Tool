import {
  Collapse, List, ListItemButton, ListItemIcon, ListItemText,
} from '@mui/material';
import { ExpandLess, ExpandMore } from '@mui/icons-material';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';

export interface NavNode {
  label: string;
  to?: string;
  icon?: JSX.Element;
  children?: NavNode[];
}

export default function NavItem({ node, depth = 0 }: { node: NavNode; depth?: number }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const active = node.to && router.pathname.startsWith(node.to);

  const Button = (
    <ListItemButton
      component={node.to ? Link : 'div'}
      href={node.to ?? ''}
      onClick={() => node.children && setOpen(!open)}
      selected={Boolean(active)}
      sx={{ pl: 2 + depth * 2 }}
    >
      {node.icon && <ListItemIcon sx={{ minWidth: 32 }}>{node.icon}</ListItemIcon>}
      <ListItemText primary={node.label} />
      {node.children && (open ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />)}
    </ListItemButton>
  );

  if (!node.children) return Button;
  return (
    <>
      {Button}
      <Collapse in={open} timeout="auto" unmountOnExit>
        <List disablePadding>
          {node.children.map((c) => (
            <NavItem key={c.label} node={c} depth={depth + 1} />
          ))}
        </List>
      </Collapse>
    </>
  );
}
